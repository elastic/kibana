
k4.pie = function() {
    'use strict';

    var width = 500,
        height = 500,
        radius = Math.min(width, height)/ 2,
        sort = null,
        label = function(d) { return d[0]; },
        value = function(d) { return d[1]; },
        outerRadius = radius - 10,
        innerRadius = 0,
        color = d3.scale.category10(),
        arc = d3.svg.arc(),
        pie = d3.layout.pie();

    function chart(selection) {
        selection.each(function(data) {
            data = data.map(function(d, i) {
                return [label.call(data, d, i), value.call(data, d, i)];
            });

            arc
                .outerRadius(outerRadius)
                .innerRadius(innerRadius);

            pie
                .sort(sort)
                .value(function(d) { return d[1]; });

            var svg = d3.select(this).append('svg');

            svg
                .attr('width', width)
                .attr('height', height);

            var gEnter = svg.append('g')
                .attr('transform', 'translate(' + width/2 + ', ' + height/2 + ')');

            var g = gEnter.selectAll('.arc')
                .data(pie(data))
                .enter().append('g')
                .attr('class', 'arc')
                .style('stroke-width', 2);

            g.append('path')
                .attr('d', arc)
                .style('fill', function (d) {
                    return color(d.data[0]);
                });

            g.append('text')
                .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
                .attr('dy', '.35em')
                .style('text-anchor', 'middle')
                .style('fill', 'white')
                .text(function(d) { console.log(d); return d.data[0]; });
        });
    }

    chart.width = function(_) {
        if (!arguments.length) { return width; }
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) { return height; }
        height = _;
        return chart;
    };

    chart.radius = function(_) {
        if (!arguments.length) { return radius; }
        radius = _;
        return chart;
    };

    chart.sort = function(_) {
        if (!arguments.length) { return sort; }
        sort = _;
        return chart;
    };

    chart.label = function(_) {
        if (!arguments.length) { return label; }
        label = _;
        return chart;
    };

    chart.value = function(_) {
        if (!arguments.length) { return value; }
        value = _;
        return chart;
    };

    chart.outerRadius = function(_) {
        if (!arguments.length) { return outerRadius; }
        outerRadius = _;
        return chart;
    };

    chart.innerRadius = function(_) {
        if (!arguments.length) { return innerRadius; }
        innerRadius = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    return chart;
};
