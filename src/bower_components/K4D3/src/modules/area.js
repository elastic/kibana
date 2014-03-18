
k4.area = function() {
    'use strict';

    var margin = {top: 20, right: 50, bottom: 50, left: 50},
        width = 960,
        height = 500,
        getX = function(d) { return d[0]; },
        getY = function(d) { return d[1]; },
        interpolate = 'cardinal',
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .ticks(10)
            .tickPadding(6)
            .orient('bottom'),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .ticks(10)
            .tickPadding(6)
            .orient('left'),
        area = d3.svg.area().x(X).y1(Y),
        line = d3.svg.line().x(X).y(Y),
        color = d3.scale.category10();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom,
                svg = d3.select(this).selectAll('svg').data([data]),
                gEnter = svg.enter().append('svg').append('g'),
                g = svg.select('g');

            data = data.map(function(d, i) {
                return [getX.call(data, d, i), getY.call(data, d, i)];
            });

            xScale
                .domain(d3.extent(data, function(d) { return d[0]; })).nice()
                .range([0, innerWidth]);

            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                .range([innerHeight, 0]);

            area.interpolate(interpolate);
            line.interpolate(interpolate);

            gEnter.append('rect').attr('class', 'background');
            gEnter.append('path').attr('class', 'area');
            gEnter.append('path').attr('class', 'line');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');

            svg
                .attr('width', width)
                .attr('height', height);

            g.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            g.select('.background')
                .attr('width', innerWidth)
                .attr('height', innerHeight);

            g.select('.area')
                .attr('d', area(data))
                .attr('d', area.y0(yScale.range()[0]))
                .attr('fill', function(d) {
                    return typeof color === 'object' ? color : color(d);
                })
                .style('opacity', 0.5);

            g.select('.line')
                .attr('d', line(data))
                .attr('fill', 'none')
                .style('stroke', function(d) {
                    return typeof color === 'object' ? color : color(d);
                })
                .style('stroke-width', 3.5);

            g.select('g.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis.tickSize(-innerHeight));

            g.select('g.y.axis')
                .call(yAxis.tickSize(-innerWidth));

            /* Mouseover */
            k4.mouseover({
                selection: g,
                data: data,
                xScale: xScale,
                yScale: yScale
            });
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
