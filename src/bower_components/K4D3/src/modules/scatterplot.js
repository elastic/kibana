
k4.scatterplot = function() {
    'use strict';

    var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = 500,
        height = 500,
        xValue = function(d) { return d[0]; }, // x axis point
        yValue = function(d) { return d[1]; }, // y axis point
        zValue = function(d) { return d[2]; }, // z for radius
        xScale = d3.scale.linear(),
        yScale = d3.scale.linear(),
        zScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .tickSize(height)
            .tickPadding(6)
            .ticks(10),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .tickSize(width)
            .tickPadding(6)
            .ticks(10),
        color = d3.scale.category10();

    function chart(selection) {
        selection.each(function(data) {
            // console.log(data);

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;
                //container = d3.select(this);

            data = data.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i), zValue.call(data, d, i)];
            });

            xScale
                .domain([0, d3.max(data, function(d) { return d[0]; })]).nice()
                .range([0, availableWidth]);

            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                .range([availableHeight, 0]);

            zScale
                .domain([0, d3.max(data, function(d) { return d[2]; })])
                .range([2, 10]); // change for sqrt

            var svg = d3.select(this).selectAll('svg').data([data]);

            var gEnter = svg.enter().append('svg').append('g').attr('class', 'inner');
            gEnter.append('g').attr('class', 'bkgd');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'points');

            svg.attr('width', width)
                .attr('height', height);

            var vertices = gEnter.select('g.points')
                .selectAll('.vertices')
                .data(data)
                .enter().append('circle')
                .attr('class', 'vertices');
            //vertices.exit().remove();
            vertices.attr('cx', function(d) {
                    return xScale(d[0]);
                })
                .attr('cy', function(d) {
                    return yScale(d[1]);
                })
                .attr('r', function(d) {
                    return zScale(d[2]);
                })
                .style('fill', function (d) {
                    return color(d[2]);
                })
                .style('fill-opacity', function () {
                    return 0.4;
                })
                .style('stroke', function (d) {
                    return color(d[2]);
                })
                .style('stroke-width', function () {
                    return 1.5;
                });

            var g = svg.select('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            g.select('g.bkgd')
                .append('rect')
                .attr('width', availableWidth)
                .attr('height', availableHeight);

            g.select('g.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis.tickSize(-availableHeight));

            g.select('g.y.axis')
                .call(yAxis.tickSize(-availableWidth));

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
        margin.top    = typeof _.top    !== 'undefined' ? _.top    : margin.top;
        margin.right  = typeof _.right  !== 'undefined' ? _.right  : margin.right;
        margin.bottom = typeof _.bottom !== 'undefined' ? _.bottom : margin.bottom;
        margin.left   = typeof _.left   !== 'undefined' ? _.left   : margin.left;
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

    chart.xValue = function(_) {
        if (!arguments.length) { return xValue; }
        xValue = _;
        return chart;
    };

    chart.yValue = function(_) {
        if (!arguments.length) { return yValue; }
        yValue = _;
        return chart;
    };

    chart.zValue = function(_) {
        if (!arguments.length) { return zValue; }
        zValue = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    return chart;
};
