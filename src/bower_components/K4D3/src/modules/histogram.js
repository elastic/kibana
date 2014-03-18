
k4.histogram = function() {
    'use strict';


    var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = 500,
        height = 500,
        bargap = 0.2,
        color = "#1191e0",
        //color = d3.scale.category10(),
        xValue = function(d) { return d[0]; }, // x axis point
        yValue = function(d) { return d[1]; }, // y axis point
        xScale = d3.scale.ordinal(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .tickSize(-height)
            .tickSubdivide(true)
            .tickPadding(6)
            .ticks(10),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .tickSize(width)
            .tickPadding(6)
            .ticks(10);

    function chart(selection) {
        selection.each(function(data) {
            // console.log(data);

            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom,
                container = d3.select(this);

            data = data.map(function(d, i) {
                return [xValue.call(data, d, i), yValue.call(data, d, i)];
            });

            xScale
                .domain( data.map(function(d) { return d[0]; }) )//.nice()
                .rangeBands([0, availableWidth], bargap);

            yScale
                  .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                  .range([availableHeight, 0]);

            var svg = d3.select(this).selectAll('svg').data([data]);
            
            var gEnter = svg.enter().append('svg').append('g').attr('class', 'inner');
            gEnter.append('g').attr('class', 'bkgd');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'bargroup');

            svg.attr('width', width)
                .attr('height', height);
            
            var bars = gEnter.selectAll('g.bargroup')
                .selectAll('.vertices')
                .data(data);

            bars.exit().remove();

            var barsEnter = bars.enter()
                .append('rect')
                .attr('x', function(d) { return xScale(d[0]); })
                .attr('width', xScale.rangeBand())
                .attr('y', function(d) { return yScale(d[1]); })
                .attr('height', function(d) { return availableHeight - yScale(d[1]); });

            bars
                .attr('class', function(d,i) {
                    return yValue(d,i) < 0 ? 'bar negative' : 'bar positive';
                })
                .style("fill", function () {
                    return color;
                });
                //.style("stroke", function (d) {
                //    return color(0);
                //});

            var g = svg.select('g')
              .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            g.select('g.bkgd')
                .append('rect')
                .attr('width', availableWidth)
                .attr('height', availableHeight);
            
            g.select('g.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis);

            g.select('g.y.axis')
                //.attr('transform', 'translate(-6,0)')
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

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        bargap = _;
        return color;
    };

    chart.bargap = function(_) {
        if (!arguments.length) { return bargap; }
        bargap = _;
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

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    return chart;

};