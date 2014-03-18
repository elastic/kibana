
k4.dendrogram = function() {
    'use strict';

    var width = 600,
        height = 2000,
        color = d3.scale.category10(),
        cluster = d3.layout.cluster()
            .size([height,  width - 200]),
        diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

    function chart(selection) {
        selection.each(function(data) {
            var nodes = cluster.nodes(data),
                links = cluster.links(nodes);

            var svg = d3.select(this).append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(120,0)');

            svg.selectAll('.link')
                .data(links)
                .enter().append('path')
                .attr('class', 'link')
                .attr('d', diagonal);

            var node = svg.selectAll('.node')
                .data(nodes)
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });

            node.append('circle')
                .attr('r', 4.5)
                .style('fill', function(d) {
                    return d.children ? '#ffffff' : color(d.name);
                })
                .style('stroke', function(d) {
                    return d.children ? '#4682B4': color(d.name);
                });

            node.append('text')
                .attr('dx', function(d) { return d.children ? -8 : 8; })
                .attr('dy', 3)
                .style('text-anchor', function(d) { return d.children ? 'end' : 'start'; })
                .text(function(d) { return d.name; });
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

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    chart.cluster = function(_) {
        if (!arguments.length) { return cluster; }
        cluster = _;
        return chart;
    };

    chart.diagonal = function(_) {
        if (!arguments.length) { return diagonal; }
        diagonal = _;
        return chart;
    };

    return chart;
};
