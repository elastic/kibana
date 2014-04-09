
define(function (require) {
    'use strict';
    var tip = require('src/tooltip'),
        d3 = require('lib/d3/d3');

    return function (elem, args) {

        var chart = {},
            elemWidth = parseInt(d3.select(elem.parentNode).style('width'), 10),
            elemHeight = d3.select(elem).attr('height'),
            stacktype = args.stacktype || 'zero', // 'zero', 'expand', 'group'
            yGroup = args.yGroup || false,
            colors = args.color,
            tooltip = args.tooltip !== undefined ? args.tooltip : true,
            numRows, margin, svg, g, layer, n, m, width, height, outerWidth, outerHeight, keys, stack, toolTip,
            xScale, yScale, xAxis, yAxis, yStackMax, yGroupMax, color,
            k1 = 'rows', k2 = 'columns', k3 = 'layers', k4 = 'values';

        chart.render = function (data) {
            
            console.log('raw data', data);

            /* ********** align x axis data / inject zeros ************* */
            // align data and set structure params
            data = alignXvals(data);
            // number of rows
            numRows = data[k1].length;
            // number of charts
            n = data[k1][0][k2].length,
            // number of layers per chart
            m = data[k1][0][k2][0][k3].length,
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
            width = outerWidth / n - margin.left - margin.right,
            height = outerHeight - margin.top - margin.bottom,

            // console.log('stacktype', stacktype, 'outerWidth', outerWidth, 'outerHeight', outerHeight, 'width', width, 'height', height);
            // console.log('numRows:', numRows, 'n:', n, 'm:', m, 'keys:', keys.length, keys);
            
            // stack layout and max values
            stack = d3.layout.stack().offset(stacktype).values(function (d) { return d.values; }),
 
            yGroupMax = d3.max(data[k1].map(function (a) {
                return d3.max(a[k2], function (b) {
                    return d3.max(stack(b.layers), function (c) {
                        return d3.max(c.values, function (d) {
                            return d.y;
                          });
                      });
                  });
              })),
 
            yStackMax = d3.max(data[k1].map(function (a) {
                return d3.max(a[k2], function (b) {
                    return d3.max(stack(b.layers), function (c) {
                        return d3.max(c.values, function (d) {
                            return d.y0 + d.y;
                          });
                      });
                  });
              })),

            /* *************** D3 parameters ********************* */
            xScale = d3.scale.ordinal().domain(keys).rangeRoundBands([0, width], 0.1),
            yScale = d3.scale.linear().range([height, 0]).nice(),
            xAxis = d3.svg.axis().scale(xScale).tickSize(3, 0).tickPadding(6)
                .orient('bottom'),
            yAxis = d3.svg.axis().scale(yScale).ticks(6).tickSize(-(width), 0).tickPadding(4).orient('left'),
            color = d3.scale.linear().domain([0, m - 1]).range(['#e24700', '#f9e593']),
            toolTip = typeof tooltip === 'boolean' && tooltip === false ? 'undefined' : typeof tooltip === 'function' ?
                tip().attr('class', 'k4-tip').html(tooltip).offset([-12, 0]) : tip().attr('class', 'k4-tip').html(function(d) {
                if (d.y < 1) { return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y.toFixed(2) * 100 + '%</span>'; }
                return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y + '</span>';
            }).offset([-12, 0]);
            /* ******************************************************** */

            // Removing items off the element
            d3.select(elem).selectAll('*').remove();

            // append svg(s)
            svg = getSvg(elem, data);
            svg.attr('width', outerWidth / n).attr('height', outerHeight);

            // render each chart
            g = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .each(function (d) {
                    var g = d3.select(this);

                    var yMax = d3.max(d.layers, function (d) {
                        return d3.max(d.values, function (e) {
                            return e.y;
                          });
                      });

                    var yStack = d3.max(d.layers, function (d) {
                        return d3.max(d.values, function (e) {
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
                        .call(xAxis)
                        .selectAll('text')
                        .attr('y', function(d,i) {
                            var nth = Math.ceil( 1.1 * this.getComputedTextLength() / (width / keys.length) );
                            if ( i % nth == 0 ) { return 7; } else { return 50; }
                        });

                    // y axis
                    g.append('g')
                        .attr('class', 'y axis')
                        .style('stroke-width', 0.5)
                        .call(yAxis);

                    // layer of bars
                    layer = g.selectAll('.layer')
                        .data(function(d) { return stack(d.layers); })
                        .enter().append('g')
                        .attr('class', function(d, i) { return 'layer layer' + i; })
                        .style('fill', function(d, i) { return color(i); });

                    //Enter
                    // bars for stack, expand, group
                    layer.selectAll('rect')
                        .data(function(d) { return d.values; })
                        .enter().append('rect');

                    // Update
                    if (stacktype === 'group') {
                        layer.selectAll('rect')
                            .attr('class', function(d, i, j) { 
                                //console.log(d, i, j); 
                                return 'rect rect' + i; 
                            })
                            .attr('x', function(d, i, j) { return xScale(d.x) + xScale.rangeBand() / m * j; })
                            .attr('width', xScale.rangeBand() / m)
                            .attr('y', function(d) { return yScale(d.y); })
                            .attr('height', function(d) { return height - yScale(d.y); })
                            //.on('mouseover', toolTip.show)
                            //.on('mouseout', toolTip.hide)
                            .on('mouseover', mouseover)
                            .on('mouseout', mouseout)
                            .on('click', click);
                    } else {
                        layer.selectAll('rect')
                            .attr('class', function(d, i, j) { 
                                //console.log(d, i, j); 
                                return 'rect rect' + i; 
                            })
                            .attr('width', xScale.rangeBand())
                            .attr('x', function(d) { return xScale(d.x); })
                            .attr('y', function(d) { return yScale(d.y0 + d.y); })
                            .attr('height', function(d) { return yScale(d.y0) - yScale(d.y0 + d.y); })
                            //.on('mouseover', toolTip.show)
                            //.on('mouseout', toolTip.hide)
                            .on('mouseover', mouseover)
                            .on('mouseout', mouseout)
                            .on('click', click);
                    }

                    //Exit
                    layer.selectAll('rect').data(function(d) { return d.values; }).exit().remove();

                });

            // Window resize
            d3.select(window).on('resize', resize);

            // k4 tooltip function
            if (tooltip) { g.call(toolTip); }

            return svg;
        };

        // append layout divs to elem and bind layout data
        function getSvg(elem, data) {
            var rows, cols, svg;

            rows = d3.select(elem).selectAll('div')
                .data(data.rows)
                .enter().append('div')
                .attr('class', function(d, i) { return 'row r' + i; })
                .style('display', 'block');

            cols = rows.selectAll('div')
                .data(function(d) { return d.columns; })
                .enter().append('div')
                .attr('class', function(d,i){ return 'col c' + i; })
                .style('display', 'inline-block');

            svg = cols.append('svg');

            return svg;
        }

        function resize() {
            /* Update graph using new width and height */
            var elemWidth = parseInt(d3.select(elem.parentNode).style('width'), 10),
                elemHeight = d3.select(elem).attr('height'), //.80 * window.innerHeight, //parseInt(d3.select(elem.parentNode).style('height'), 10),
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
                xAxis = d3.svg.axis().scale(xScale).tickSize(4, 0).tickPadding(6)
                    .orient('bottom'),
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
                    .call(xAxis)
                    .selectAll('text')
                    .attr('y', function(d,i) {
                        var nth = Math.ceil( 1.1 * this.getComputedTextLength() / (width / keys.length) );
                        if ( i % nth == 0 ) { return 7; } else { return 50; }
                    });

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

        // aligns x axis values and splices in zeros as needed
        function alignXvals (data) {
            //
            k1 = 'rows', k2 = 'columns', k3 = 'layers', k4 = 'values';
            var xKeys = [], i;
            if (!data.rows) {
                k1 = 'columns', k2 = 'rows';
            }
            if (!data[k1][0][k2][0].layers) {
                k3 = 'series';
            }
            
            data[k1].map(function (a) {
                return a[k2].map(function (b) {
                    return b[k3].map(function (c) {
                        return c[k4].map(function (d) {
                            xKeys.push(d.x);
                        });
                    })
                })
            });
            // get uniques from list
            xKeys = keys = d3.set(xKeys).values();
            // add values in same order as uniques
            data[k1].map(function (a) {
                return a[k2].map(function (b) {
                    return b[k3].map(function (c) {
                        i = 0;
                        xKeys.forEach(function (d) {
                            if (!c[k4][i]) {
                                // last value
                                c[k4].push({x: d, y: 0});
                            } else {
                                // if not a match splice
                                if ( String(c[k4][i].x) !== d ) {
                                    c[k4].splice(i,0,{x: d, y:0});
                                }
                            }
                            i++;
                        });
                    });
                });
            });
            return data;
        }

        // event handlers
        function mouseover(e) {
            mouseHandler('mouseover', e, d3.mouse(this), this);
            //toolTip.show();
        }

        function mouseout(e) {
            mouseHandler('mouseout', e, d3.mouse(this), this);
            //toolTip.hide();
        }

        function click(e) {
            mouseHandler('click', e, d3.mouse(this), this);
        }

        function drag(e) {
            //console.log('drag');
        }

        function mouseHandler(type, e, mouse, target) {
            //console.log( type, e, mouse, target );
        }

        // getters
        chart.margin = function() {
            if (!args.margin) { return margin; }
            margin.top    = typeof args.margin.top    !== 'undefined' ? args.margin.top    : margin.top;
            margin.right  = typeof args.margin.right  !== 'undefined' ? args.margin.right  : margin.right;
            margin.bottom = typeof args.margin.bottom !== 'undefined' ? args.margin.bottom : margin.bottom;
            margin.left   = typeof args.margin.left   !== 'undefined' ? args.margin.left   : margin.left;
            return margin;
        };

        chart.type = function(_) {
            if (!arguments.length) { return stacktype; }
            stacktype = _;
            return chart;
        };

        /*
        chart.tooltip = function(_) {
            if (!arguments.length) { return tooltip; }
            tooltip = _;
            return chart;
        }
        */

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
