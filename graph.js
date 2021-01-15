const dimension = { height: 300, width: 300, radius: 150 };
const center = { x: (dimension.width / 2 + 5), y: (dimension.height / 2 + 5) };

const svg = d3.select('.canvas')
    .append('svg')
    .attr('width', dimension.width + 150)
    .attr('height', dimension.height + 150);

const graph = svg.append('g')
    .attr('transform', `translate(${center.x}, ${center.y})`);

const pie = d3.pie()
    .sort(null)
    .value(d => d.cost);

const arcPath = d3.arc()
    .outerRadius(dimension.radius)
    .innerRadius(dimension.radius / 2);

const colour = d3.scaleOrdinal(d3['schemeSet3']);

// legend setup
const legendGroup = svg.append('g')
    .attr('transform', `translate(${dimension.width + 40}, 10)`);
const legend = d3.legendColor()
    .shape('circle')
    .shapePadding(10)
    .scale(colour);

// tip
const tip = d3.tip()
    .attr('class', 'tip card')
    .html(d => {
        let content = `<div class="name">${d.data.name}</div>`;
        content += `<div class="cost">$${d.data.cost}</div>`;
        content += `<div class="delete">Click slice to delete!</div>`;
        return content;
    });

graph.call(tip);

const update = (data) => {
    
    colour.domain(data.map(d => d.name)); 

    legendGroup.call(legend);
    legendGroup.selectAll('text').attr('fill', 'white');

    const paths = graph.selectAll('path')
        .data(pie(data));

    paths.exit()
        .transition().duration(750)
        .attrTween('d', arcTweenExit)
        .remove();

    paths.attr('d', arcPath)
        .transition().duration(750)
        .attrTween('d', arcTweenUpdate);

    paths.enter()
        .append('path')
            .attr('class', 'arc')
            .attr('d', arcPath)
            .attr('stroke', '#242423')
            .attr('stroke-width', 1)
            .attr('fill', d => colour(d.data.name))
            .each(function(d){ this._current = d })
            .transition().duration(750)
                .attrTween('d', arcTweenEnter);

    graph.selectAll('path')
        .on('mouseover', (d,i,n) => {
            tip.show(d, n[i]);
            handleMouseOver(d,i,n);
        })
        .on('mouseout', (d,i,n) => {
            tip.hide();
            handleMouseOut(d,i,n);
        })
        .on('click', handleClick);
};

// data aray and firestore
var data = [];

db.collection('expenses').onSnapshot(res => {
    res.docChanges().forEach(change => {
        const doc = {...change.doc.data(), id: change.doc.id };
        switch (change.type) {
            case 'added':
                data.push(doc);
                break;
            case 'modified':
                const index = data.findIndex(item => item.id == doc.id);
                data[index] = doc;
                break;
            case 'removed':
                data = data.filter(item => item.id !== doc.id);
                break;
            default:
                break;
        }
    });

    update(data);

});

const arcTweenEnter = (d) => {
    var i = d3.interpolate(d.endAngle, d.startAngle);
    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
};

const arcTweenExit = (d) => {
    var i = d3.interpolate(d.startAngle, d.endAngle);
    return function(t){
        d.startAngle = i(t);
        return arcPath(d);
    }
};

function arcTweenUpdate(d) {
    var i = d3.interpolate(this._current, d)
    this._current = d;
    return function(t) {
        return arcPath(i(t));
    }
}

const handleMouseOver = (d, i, n) => {
    d3.select(n[i])
        .transition('changeSliceFill').duration(300)
            .attr('fill', '#333533');
};

const handleMouseOut = (d, i, n) => {
    d3.select(n[i])
        .transition('changeSliceFill').duration(300)
            .attr('fill', colour(d.data.name));
};

const handleClick = (d) => {
    const id = d.data.id;
    db.collection('expenses').doc(id).delete();
};