
define(function(require) {
    'use strict';
    var tooltip = require('../tooltip'),
        d3 = require('d3');

    return function(elem, args) {

        var chart = {},
            elemWidth = parseInt(d3.select(elem).style('width'), 10),
            elemHeight = parseInt(d3.select(elem).style('padding-bottom'), 10),
            stacktype = args.stacktype || 'zero', // 'zero', 'expand', 'group'
            yGroup = args.yGroup || false,
            colors = args.color,
            numRows, margin, svg, g, layer, n, m, width, height, outerWidth, outerHeight, keys, stack, toolTip,
            xScale, yScale, xAxis, yAxis, yStackMax, yGroupMax, color;

        chart.render = function(data) {

            /* ********** Sizing DOM Elements ************* */
            // number of rows
            numRows = data.rows.length,
            // number of charts
            n = data.rows[0].columns.length,
            // number of layers per chart
            m = data.rows[0].columns[0].layers.length,
            // row width
            outerWidth = elemWidth,
            // row height
            outerHeight = elemHeight / numRows,
            margin = {
                top: outerHeight * 0.05,
                right: outerWidth * 0.01,
                bottom: outerHeight * 0.15,
                left: outerWidth * 0.05
            },
            // svg width/height
            width = outerWidth/n - margin.left - margin.right,
            height = outerHeight - margin.top - margin.bottom,
            /* ************************************************** */

            /* ************* Data manipulation **************** */
            // pulls out the x-axis key values
            keys = data.rows[0].columns[0].layers[0].values.map(function(item) { return item.x; }),
            stack = d3.layout.stack().offset(stacktype).values(function(d) { return d.values; }),
            yGroupMax = d3.max(data.rows.map(function(data) {
                return d3.max(data.columns, function(col) {
                    return d3.max(stack(col.layers), function(layer) {
                        return d3.max(layer.values, function(d) {
                            return d.y;
                        });
                    });
                });
            })),
            yStackMax = d3.max(data.rows.map(function(data) {
                return d3.max(data.columns, function(col) {
                    return d3.max(stack(col.layers), function(layer) {
                        return d3.max(layer.values, function(d) {
                            return d.y0 + d.y;
                        });
                    });
                });
            })),
            /* **************************************************** */

            /* *************** D3 parameters ********************* */
            xScale = d3.scale.ordinal().domain(keys).rangeRoundBands([0, width], 0.1),
            yScale = d3.scale.linear().range([height, 0]).nice(),
            xAxis = d3.svg.axis().scale(xScale).ticks(6).tickSize(3, 0).tickPadding(6).orient('bottom'),
            yAxis = d3.svg.axis().scale(yScale).ticks(6).tickSize(-(width), 0).tickPadding(4).orient('left'),
            color = d3.scale.linear().domain([0, m - 1]).range(colors) ||
                d3.scale.linear().domain([0, m - 1]).range(['#e24700', '#f9e593']),
            toolTip = tooltip().attr('class', 'k4-tip').html(function(d) {
                if (d.y < 1) { return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y.toFixed(2) * 100 + '%</span>'; }
                return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y + '</span>';
            }).offset([-12, 0]);
            /* ******************************************************** */

            // append svg(s)
            svg = getSvg(elem, data);
            svg.attr('width', outerWidth/n).attr('height', outerHeight);

            // render each chart
            g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .each(function(d) {
                    var g = d3.select(this);

                    var yMax = d3.max(d.layers, function(d) {
                        return d3.max(d.values, function(e) {
                            return e.y;
                        });
                    });

                    var yStack = d3.max(d.layers, function(d) {
                        return d3.max(d.values, function(e) {
                            return e.y0 + e.y;
                        });
                    });

                    // Change y/xScale domain based on stacktype
                    if (stacktype === 'expand') { yScale.domain([0, 1]); }
                    else if (stacktype === 'zero') {
                        if (yGroup) {
                            yScale.domain([0, yStackMax]).nice();
                        } else {
                            yScale.domain([0, yStack]).nice();
                        }
                    }
                    else if (stacktype === 'group') {
                        if (yGroup) {
                            xScale.rangeRoundBands([0, width], 0.2);
                            yScale.domain([0, yGroupMax]).nice();
                        } else {
                            xScale.rangeRoundBands([0, width], 0.2);
                            yScale.domain([0, yMax]).nice();
                        }
                    }

                    // background rect
                    g.append('g')
                        .append('rect')
                        .attr('class', 'bkgd')
                        .style('fill', '#fff')
                        .style('opacity', 0.35)
                        .attr('width', width)
                        .attr('height', height);

                    // x axis
                    g.append('g')
                        .attr('class', 'x axis')
                        .attr('transform', 'translate(0,' + height + ')')
                        .style('stroke-width', 0.5)
                        .call(xAxis);

                    // y axis
                    g.append('g')
                        .attr('class', 'y axis')
                        .style('stroke-width', 0.5)
                        .call(yAxis);

                    // layer of bars
                    layer = g.selectAll('.layer')
                        .data(function(d) { return stack(d.layers); })
                        .enter().append('g')
                        .attr('class', 'layer')
                        .style('fill', function(d, i) { return color(i); });

                    //Enter
                    // bars for stack, expand, group
                    layer.selectAll('rect')
                        .data(function(d) { return d.values; })
                        .enter().append('rect');

                    // Update
                    if (stacktype === 'group') {
                        layer.selectAll('rect')
                            .attr('x', function(d, i, j) { return xScale(d.x) + xScale.rangeBand() / m * j; })
                            .attr('width', xScale.rangeBand() / m)
                            .attr('y', function(d) { return yScale(d.y); })
                            .attr('height', function(d) { return height - yScale(d.y); })
                            .on('mouseover', toolTip.show)
                            .on('mouseout', toolTip.hide);
                    } else {
                        layer.selectAll('rect')
                            .attr('width', xScale.rangeBand())
                            .attr('x', function(d) { return xScale(d.x); })
                            .attr('y', function(d) { return yScale(d.y0 + d.y); })
                            .attr('height', function(d) { return yScale(d.y0) - yScale(d.y0 + d.y); })
                            .on('mouseover', toolTip.show)
                            .on('mouseout', toolTip.hide);
                    }

                    //Exit
                    layer.selectAll('rect').data(function(d) { return d.values; }).exit().remove();

                });

            // Window resize
            d3.select(window).on('resize', resize);

            // k4 tooltip function
            g.call(toolTip);

            return svg;
        };

        // append layout divs to elem and bind layout data
        function getSvg(elem, data) {
            var rows, cols, svg;

            rows = d3.select(elem).selectAll('div')
                .data(data.rows)
                .enter().append('div')
                .attr('class', function(d, i) { return 'row r' + i; });

            cols = rows.selectAll('div')
                .data(function(d) { return d.columns; })
                .enter().append('div')
                .attr('class', function(d,i){ return 'col c' + i; });

            svg = cols.append('svg');

            return svg;
        }

        function resize() {
            /* Update graph using new width and height */
            var elemWidth = parseInt(d3.select(elem).style('width'), 10),
                elemHeight = parseInt(d3.select(elem).style('padding-bottom'), 10),
                outerWidth = elemWidth / n,
                outerHeight = elemHeight / numRows,
                width = outerWidth - margin.left - margin.right,
                height = outerHeight - margin.top - margin.bottom;

            d3.select('.row r').style('width', elemWidth).style('height', outerHeight);
            d3.select('.col c').style ('width', outerWidth).style('height', outerHeight);
            svg.attr('width', outerWidth).attr('height', outerHeight);

            g.each(function(d) {
                var g = d3.select(this);

                var yMax = d3.max(d.layers, function(d) { return d3.max(d.values, function(e) { return e.y; }); });
                var yStack = d3.max(d.layers, function(d) { return d3.max(d.values, function(e) { return e.y0 + e.y; }); });

                // Change y/xScale domain based on stacktype
                if (stacktype === 'expand') { yScale.domain([0, 1]); }
                else if (stacktype === 'zero') {
                    if (yGroup) {
                        yScale.domain([0, yStackMax]).nice();
                    } else {
                        yScale.domain([0, yStack]).nice();
                    }
                }
                else if (stacktype === 'group') {
                    if (yGroup) {
                        xScale.rangeRoundBands([0, width], 0.2);
                        yScale.domain([0, yGroupMax]).nice();
                    } else {
                        xScale.rangeRoundBands([0, width], 0.2);
                        yScale.domain([0, yMax]).nice();
                    }
                }

                /* Update the range of the scale with new width/height */
                xScale.rangeRoundBands([0, width], 0.1);
                yScale.range([height, 0]).nice();
                xAxis.ticks(Math.max(width/50, 2));
                yAxis.ticks(Math.max(height/20, 2)).tickSize(-(width), 0);

                if (width < 300 && height < 80) {
                    g.select('.x.axis').style('display', 'none');
                } else {
                    g.select('.x.axis').style('display', 'initial');
                    g.select('.y.axis').style('display', 'initial');
                }

                g.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
                g.selectAll('.bkgd').attr('width', width).attr('height', height);

                /* Update the axis with the new scale */
                g.select('.x.axis')
                    .attr('transform', 'translate(0,' + height + ')')
                    .call(xAxis);

                g.select('.y.axis')
                    .call(yAxis);

                /* Force D3 to recalculate and update the line */
                if (stacktype === 'group') {
                    g.selectAll('.layer').selectAll('rect')
                        .attr( 'x', function (d, i, j) { return xScale(d.x) + xScale.rangeBand() / m * j; })
                        .attr('width', xScale.rangeBand() / m)
                        .attr( 'y', function (d) { return yScale(d.y); })
                        .attr( 'height', function (d) { return height - yScale(d.y); });
                } else {
                    g.selectAll('.layer').selectAll('rect')
                        .attr('width', xScale.rangeBand())
                        .attr('x', function(d) { return xScale(d.x); })
                        .attr('height', function(d) { return yScale(d.y0) - yScale(d.y0 + d.y); })
                        .attr('y', function(d) { return yScale(d.y0 + d.y); });
                }
            });
        }

        chart.margin = function() {
            if (!args.margin) { return margin; }
            margin.top    = typeof args.margin.top    !== 'undefined' ? args.margin.top    : margin.top;
            margin.right  = typeof args.margin.right  !== 'undefined' ? args.margin.right  : margin.right;
            margin.bottom = typeof args.margin.bottom !== 'undefined' ? args.margin.bottom : margin.bottom;
            margin.left   = typeof args.margin.left   !== 'undefined' ? args.margin.left   : margin.left;
            return margin;
        };

        chart.width = function() {
            if (!args.width) { return width; }
            width = args.width;
            return width;
        };

        chart.height = function() {
            if (!args.height) { return height; }
            height = args.height;
            return height;
        };

        chart.color = function() {
            if (!args.color) { return color; }
            color = args.color;
            return color;
        };

        return chart;
    };
});
