
k4.sparkline = function() {
    'use strict';

    var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = 760,
        height = 120,
        xValue = function(d) { return d[0]; },
        yValue = function(d) { return d[1]; },
        interpolate = 'linear',
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        line = d3.svg.line()
            .x(X)
            .y(Y);

    function chart(selection) {
        selection.each(function(data) {
            data = data.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i)];
            });
            console.log(data);

            xScale
                .domain(d3.extent(data, function(d) { return d[0]; }))
                .range([0, width - margin.left - margin.right]);

            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })])
                .range([height - margin.top - margin.bottom, 0]);

            line.interpolate(interpolate);

            var svg = d3.select(this).selectAll('svg').data([data]);

            var gEnter = svg.enter().append('svg').append('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            gEnter.append('path')
                .attr('class', 'sparkline')
                .attr('d', line);

            svg.attr('width', width)
                .attr('height', height);
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
        if (!arguments.length) { return xValue; }
        xValue = _;
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) { return yValue; }
        yValue = _;
        return chart;
    };

    chart.interpolate = function (_) {
        if (!arguments.length) { return interpolate; }
        interpolate = _;
        return chart;
    };

    return chart;
};
