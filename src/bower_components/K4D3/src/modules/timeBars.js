
k4.timebars = function() {
    'use strict';

    var customTimeFormat = d3.time.format.multi([
        ['.%L',   function(d) { return d.getMilliseconds(); }],
        [':%S',   function(d) { return d.getSeconds(); }],
        ['%I:%M', function(d) { return d.getMinutes(); }],
        ['%I %p', function(d) { return d.getHours(); }],
        ['%a %d', function(d) { return d.getDay() && d.getDate() !== 1; }],
        ['%b %d', function(d) { return d.getDate() !== 1; }],
        ['%B',    function(d) { return d.getMonth(); }],
        ['%Y',    function()  { return true; }]
    ]);

    var margin = {top: 20, right: 20, bottom: 20, left: 50},
        width = 500,
        height = 500,
        bargap = 0.2,
        color = '#1191e0',
        transitionInterval = false,
        xTimeInterval = false,
        maxBars = false,
        xValue = function(d) { return d[0]; }, // x axis point
        yValue = function(d) { return d[1]; }, // y axis point
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .tickFormat(customTimeFormat)
            .tickSubdivide(true)
            .tickPadding(6)
            .ticks(20),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .tickSize(width)
            .tickPadding(6)
            .ticks(5);

    function chart(selection) {
        
        selection.each(function(data) {
            
            var availableWidth = width - margin.left - margin.right,
                availableHeight = height - margin.top - margin.bottom;
                
            data = data.map(function(d, i) {
                //console.log(d);
                return [xValue.call(data, d, i), yValue.call(data, d, i)];
            });

            // axes
            xAxis
                //.innerTickSize(-availableHeight)
                .outerTickSize(-availableHeight)
                .ticks(d3.time.seconds, 1)
                .tickPadding(6);

            yAxis.tickSize(-availableWidth);
            
            // update the x-scale
            xScale
                .domain([data[0][0], data[data.length - 1][0]])//.nice()
                .range([0, availableWidth]);

            // update the y-scale
            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                .rangeRound([availableHeight, 0]);
                
            var svg = d3.select(this).selectAll('svg').data([data]);
            
            var gEnter = svg.enter().append('svg').append('g').attr('class', 'inner');

            // groups
            gEnter.append('g').attr('class', 'bkgd');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'bargroup');

            // need to add the clip rect
            
            // bind data to bars
            var bars = svg.select('g.inner').select('g.bargroup').selectAll('.bars')
                .data(data, function(d) { return d[0]; });

            // bars enter/append
            bars.enter().append('rect')
                .attr('class', 'bars')
                .attr('x', function(d) {
                    
                    console.log( 'ANIMATION', data.length, availableWidth/data.length);
                    
                    return xScale( d[0] + xTimeInterval ) - 0;
                })
                .attr('y', function(d) {
                    return yScale( d[1] );
                })
                .attr('width', availableWidth / data.length * ( 1 - bargap))
                .attr('height', function(d) {
                    return availableHeight - yScale( d[1] );
                })
                .style('fill', function () {
                    return color;
                })
                .transition()
                .duration(transitionInterval)
                .attr('x', function(d) {
                    return xScale( d[0] + ( 0.5 * bargap ));
                });

            // update all bars
            bars.transition()
                .duration(transitionInterval)
                .attr('x', function(d) {
                    return xScale( d[0] + ( 0.5 * bargap ));
                })
                .attr('width', availableWidth / data.length * ( 1 - bargap));

            // bars exit/remove
            bars.exit()
                .transition()
                .duration(transitionInterval)
                .attr('x', function(d) {
                    return xScale( d[0] - xTimeInterval + ( 0.5 * bargap ));
                })
                .remove();

            // update the outer dimensions
            svg.attr('width', width)
                .attr('height', height);
            
            // update the inner dimensions
            var g = svg.select('g')
              .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            g.select('g.bkgd')
                .attr('width', availableWidth)
                .attr('height', availableHeight);
                
            // update the x-axis
            g.select('g.x.axis')
                .transition()
                .duration(transitionInterval)
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis);

            // update the y-axis
            g.select('g.y.axis')
                .transition()
                .duration(transitionInterval)
                .call(yAxis);

        });
            
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

    chart.transitionInterval = function(_) {
        if (!arguments.length) { return transitionInterval; }
        transitionInterval = _;
        return chart;
    };

    chart.xTimeInterval = function(_) {
        if (!arguments.length) { return xTimeInterval; }
        xTimeInterval = _;
        return chart;
    };

    chart.maxBars = function(_) {
        if (!arguments.length) { return maxBars; }
        maxBars = _;
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
