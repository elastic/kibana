
k4.sunburst = function() {
    'use strict';

    var width = 960,
        height = 700,
        radius = Math.min(width, height) / 2,
        color = d3.scale.category20c(),
        x = d3.scale.linear()
            .range([0, 2 * Math.PI]),
        y = d3.scale.sqrt()
            .range([0, radius]),
        value = function(d) { return 1; },
        partition = d3.layout.partition(),
        arc = d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

    function chart(selection) {
        selection.each(function(data) {
            var svg = d3.select(this).append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(' + width/2 + ',' + height * 0.52 + ')');

            partition
                .sort(null)
                .size([2 * Math.PI, radius * radius])
                .value(value);

            svg.datum(data).selectAll('path')
                .data(partition.nodes)
                .enter().append('path')
                .attr('display', function(d) { return d.depth ? null : "none"; })
                .attr('d', arc)
                .style('stroke', '#fff')
                .style('fill', function(d) { return color((d.children ? d : d.parent).name); })
                .style('fill-rule', 'evenodd');
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
        return radius;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) { return xValue; }
        xValue = _;
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) { return yValue; }
        yValue = _;
        return chart;
    };

    chart.value = function(_) {
        if (!arguments.length) { return value; }
        value = _;
        return chart;
    };

    return chart;
};
