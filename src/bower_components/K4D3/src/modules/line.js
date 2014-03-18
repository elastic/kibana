
k4.line = function() {
    'use strict';

    var margin = {top: 20, right: 50, bottom: 50, left: 50},
        width = 760,
        height = 120,
        getX = function(d) { return d[0]; },
        getY = function(d) { return d[1]; },
        getZ = function(d) { return d[2]; },
        interpolate = 'cardinal',
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .ticks(10)
            .tickPadding(6),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .ticks(10)
            .tickPadding(6),
        line = d3.svg.line()
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y); }),
        color = d3.scale.category10();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom;

            data = data.map(function(d, i) {
                return [getX.call(data, d, i), getY.call(data, d, i), getZ.call(data, d, i)];
            });

            xScale
                .domain(d3.extent(data, function(d) { return d[0]; })).nice()
                .range([0, width - margin.left - margin.right]);

            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                .range([height - margin.top - margin.bottom, 0]);

            line.interpolate(interpolate);

            color.domain(data.map(function(d) { return d[2]; }));

            var groups = color.domain().map(function(name) {
                data.forEach(function(d) {
                    console.log(d[2] === name);
                    if (d[2] === name) {
                        return {
                            name: name,
                            values: {x: d[0], y: d[1]}
                        };
                    }
                });
            });
            console.log(groups);

            var svg = d3.select(this).selectAll('svg').data([data]);

            var gEnter = svg.enter().append('svg').append('g');
            gEnter.append('rect').attr('class', 'background');
            gEnter.append('g').attr('class', 'line');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'points');

            svg
                .attr('width', width)
                .attr('height', height);

            var g = svg.select('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            // Circles
            g.select('.points').selectAll('.points').append('circle')
                .data(data)
                .enter().append('circle')
                .attr('class', 'points')
                .attr('cx', X)
                .attr('cy', Y)
                .attr('r', 4.5)
                .style('fill', 'white')
                .style('fill-opacity', function () {
                    return 1;
                })
                .style('stroke', function(d) {
                    return typeof color === 'object' ? color[d] : color(d[2]);
                })
                .style('stroke-width', function () {
                    return 1.5;
                });

            g.select('.background')
                .attr('width', innerWidth)
                .attr('height', innerHeight);

            g.select('.line').selectAll('.series').data(groups)
                .enter().append('path')
                .attr('class', 'series')
                .attr('d', function(d) { return line(d.values); })
                .attr('fill', 'none')
                .attr('stroke', function(d) {
                    return typeof color === 'object' ? color[d.name] : color(d.name);
                })
                .attr('stoke-width', 3);

            g.select('.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis.tickSize(-innerHeight));

            g.select('.y.axis')
                .call(yAxis.tickSize(-innerWidth));
        });
    }

    function X(d) {
        return xScale(d[0]);
    }

    function Y(d) {
        return yScale(d[1]);
    }

    chart.margin = function(_) {
        if (!arguments.length) { return margin; }
        margin.top = typeof _.top !== 'undefined' ? _.top : margin.top;
        margin.right = typeof _.right !== 'undefined' ? _.right : margin.right;
        margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
        margin.left = typeof _.left !== 'undefined' ? _.left : margin.left;
        return chart;
    };

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

    chart.x = function(_) {
        if (!arguments.length) { return getX; }
        getX = _;
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) { return getY; }
        getY = _;
        return chart;
    };

    chart.z = function(_) {
        if (!arguments.length) { return getZ; }
        getZ = _;
        return chart;
    };

    chart.interpolate = function(_) {
        if (!arguments.length) { return interpolate; }
        interpolate = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    return chart;
};
