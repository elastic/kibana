
k4.heatmap = function() {
    'use strict';

    var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = 500,
        height = 500,
        rad = 0,
        rows = 10,
        cols = 20,
        strokecolor = '#666',
        strokeweight = 0,
        xValue = function(d) { return d[0]; }, // x axis point
        yValue = function(d) { return d[1]; }, // y axis point
        zValue = function(d) { return d[2]; }, // z for radius
        xScale = d3.scale.linear(),
        yScale = d3.scale.linear(),
        zScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            //.tickSize(height)
            .tickPadding(6)
            .ticks(10),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            //.tickSize(width)
            .tickPadding(6)
            .ticks(10),
        // colors = d3.scale.category10(),
        colors = ['#1d2b38','#1a415d','#005c75','#007784','#009286','#49ac7e','#89c272'],
        colorScale = d3.scale.quantile();


    function chart(selection) {

        selection.each(function(data) {
            //console.log(data);

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;
                //container = d3.select(this);

            var vals = data.map(function(n) { return n.z; });
            //console.log(vals);

            var gridw = availableWidth / (cols-1);
            var gridh = availableHeight / (rows-1);

            colorScale.domain(vals).range(colors);
            data = data.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i), zValue.call(data, d, i)];
            });

            xScale
                //.domain([ d3.min(data, function(d) { return d[0]; }), d3.max(data, function(d) { return d[0]; }) ])//.nice()
                .domain([ 1, cols ])//.nice()
                .range([ 1, availableWidth ]);

            yScale
                //.domain([ d3.min(data, function(d) { return d[1]; }), d3.max(data, function(d) { return d[1]; }) ])//.nice()
                .domain([ 1, rows ])//.nice()
                .range([ availableHeight, 1 ]);

            zScale
                .domain([ d3.min(data, function(d) { return d[2]; }), d3.max(data, function(d) { return d[2]; }) ])
                .range([2, 10]); // do we need?

            var svg = d3.select(this).selectAll('svg').data([data]);

            var gEnter = svg.enter().append('svg').append('g').attr('class', 'inner');
            gEnter.append('g').attr('class', 'bkgd');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'points');

            svg.attr('width', width)
                .attr('height', height);

            gEnter.select('g.points')
                .selectAll('.vertices')
                .data(data)
                .enter().append('rect')
                .attr('x', function(d) {
                    return ( (d[0]-1) * gridw ) - (gridh * 0.5);
                })
                .attr('y', function(d) {
                    return ( (d[1]-1) * gridh ) - (gridh * 1);
                })
                .attr('rx', rad)
                .attr('ry', rad)
                .attr('class', 'block')
                .attr('width', gridw)
                .attr('height', gridh)
                //.attr('transform', 'translate(' + (gridw / -2) + ', ' + (gridh / -2) + ')')
                .style('fill', function(d) {
                    return colorScale(d[2]);
                })
                .style('fill-opacity', function () {
                    return 0.8;
                })
                .style('stroke', function () {
                    // return colorScale(d[2]);
                    return strokecolor;
                })
                .style('stroke-width', function () {
                    return strokeweight;
                });

            var g = svg.select('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            g.select('g.x.axis')
                .attr('transform', 'translate(' + 0 + ',' + ( yScale.range()[0] ) + ')')
                .call(xAxis.tickSize(-availableHeight));

            g.select('g.y.axis')
                .attr('transform', 'translate(' + ( gridh / -2 ) + ',' + ( gridh / -2 )+ ')')
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

    chart.rows = function(_) {
        if (!arguments.length) { return rows; }
        rows = _;
        return chart;
    };

    chart.cols = function(_) {
        if (!arguments.length) { return cols; }
        cols = _;
        return chart;
    };

    chart.colors = function(_) {
        if (!arguments.length) { return colors; }
        colors = _;
        return chart;
    };

    chart.strokecolor = function(_) {
        if (!arguments.length) { return strokecolor; }
        strokecolor = _;
        return chart;
    };

    chart.strokeweight = function(_) {
        if (!arguments.length) { return strokeweight; }
        strokeweight = _;
        return chart;
    };

    chart.rad = function(_) {
        if (!arguments.length) { return rad; }
        rad = _;
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
        if (!arguments.length) { return colors; }
        colors = _;
        return chart;
    };

    return chart;
};
