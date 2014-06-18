define(function(require) {
    'use strict';

    var d3 = require('lib/d3/d3'),
        selectionFn = require('src/utils/selection'),
        zeroInjection = require('src/utils/zeroInjection'),
        legendFn = require('src/modules/legend'),
        colorFn = require('src/utils/colorspace');

    return function area(elem, args) {
        if (typeof args === 'undefined') { args = {}; }

        var chart = {},

        /* ***** Chart Options ***** */
            addLegend = args.addLegend || true,
            addTooltip = args.addTooltip || true,
            shareYAxis = args.shareYAxis || false,
        /* ************************* */

        /* ***** Chart Flags ******* */
            destroyFlag = false,
        /* ************************* */

        /* ***** Chart Globals ******* */
            dispatch = d3.dispatch('hover', 'click', 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'brush'),
            margin = args.margin || { top: 35, right: 15, bottom: 35, left: 50 },
            $elem = $(elem), // cached jquery version of element
            vis = d3.select(elem),
            height,
            width,
            latestData,
            chartwrapper,
            selection,
            selectors,
            colDomain,
            getColors,
            legend,
            tip,
            allLayers,
            color = d3.scale.category10(),
            mousemove,
            scrolltop,
            allItms = false,
            xValue = function(d, i) { return d.x; },
            yValue = function(d, i) { return d.y; };
        /* ************************* */

        chart.render = function(data) {
            // removes elements to redraw the chart on subsequent calls
            d3.select(elem).selectAll('*').remove();

            // store a copy of the data sent to render, so that it can be resent with .resize()
            latestData = data;

            if (destroyFlag || !elem) {
                if (destroyFlag) { throw new Error('you destroyed this chart and then tried to use it again'); }
                else { throw new Error('there is no element present'); }
            }

            // HTML div in which charts are contained
            chartwrapper = d3.select(elem).append('div')
                .attr('class', 'chartwrapper')
                .style('height', $(elem).height() + 'px');

            // Selection function - returns an array of DOM elements with data bound
            selectors = selectionFn(chartwrapper[0][0], latestData);

            try { selection = d3.selectAll(selectors); }
            catch(error) { return; }

            // get colDomain from chart obj
            colDomain = chart.colorDomain(selection);

            // color domain
            getColors = colorFn(colDomain.length);
            chart.colorObj = _.zipObject(colDomain, getColors);

            // Chart options
            if (addLegend) {
                legend = legendFn(elem, selection, chart);
                allItms = d3.select('.legendwrapper').selectAll('li.legends');
            }

            if (addTooltip) { tip = d3.select(elem).append('div').attr('class', 'k4tip'); }

            try {
                selection.each(function(d, i) {
                    var that = this;
                    chart.createAreaChart({'data': d, 'index': i, 'this': that});
                });
            } catch (err) {
                if (err.message === 'chart too small') { chart.error(); }
                console.group(err);
            }

            return chart;
        };


        /* Color domain */
        chart.colorDomain = function(selection) {
            var items = [];
            selection.each(function(d) {
                d.series.forEach(function(label) {
                    if (label.label) { items.push(label.label); }
                    else { items.push(d.yAxisLabel); }
                });
            });

            items = _.uniq(items);
            return items;
        };

        /* Function for global yAxis */
        chart.globalYAxisFn = function(selection) {
            var yArray = [];

            selection.each(function(d) {
                return d3.max(d.series, function(layer) {
                    return d3.max(layer.values, function(d) {
                        yArray.push(d.y);
                    });
                });
            });

            return d3.max(yArray);
        };

        chart.getBounds = function(data) {
            var bounds = [];

            data.series.map(function(series) {
                series.values.map(function(d, i) {
                    bounds.push({
                        x: xValue.call(series, d, i),
                        y: yValue.call(series, d, i)
                    });
                });
            });

            return bounds;
        };

        chart.createAreaChart= function(args) {
            if (typeof args === 'undefined') { args = {}; }

            var data = args.data,
                that = args.this,

                // width, height, margins
                elemWidth = parseInt(d3.select(that).style('width'), 10),
                elemHeight = parseInt(d3.select(that).style('height'), 10),
                width = elemWidth - margin.left - margin.right, // width of the parent element ???
                height = elemHeight - margin.top - margin.bottom, // height of the parent element ???
                seriesData = [],
                xAxisLabel = data.xAxisLabel,
                yAxisLabel = data.yAxisLabel,
                label = data.label,
                xAxisFormatter = data.xAxisFormatter,
                yAxisFormatter = data.yAxisFormatter,
                tooltipFormatter = data.tooltipFormatter,
                brush;

            data.series.map(function(series) {
                seriesData.push(series);
            });

            var interpolate = "linear",
                xTickScale = d3.scale.linear().clamp(true).domain([80, 300, 800]).range([0, 2, 4]),
                xTickN = Math.floor(xTickScale(width)),
                ytickScale = d3.scale.linear().clamp(true).domain([20, 40, 1000]).range([0, 1, 10]),
                ytickN = Math.floor(ytickScale(height)),
                xScale = d3.time.scale()
                    .domain(d3.extent(chart.getBounds(data), function(d) { return d.x; }))
                    .range([0, width]),
                yScale = d3.scale.linear()
                    .domain([0, d3.max(chart.getBounds(data), function(d) { return d.y; })])
                    .range([height, 0]),
                xAxis = d3.svg.axis().scale(xScale).ticks(xTickN).tickPadding(5).tickFormat(xAxisFormatter).orient("bottom"),
                yAxis = d3.svg.axis().scale(yScale).ticks(ytickN).tickPadding(4).tickFormat(yAxisFormatter).orient("left"),
                area = d3.svg.area().x(X).y0(height).y1(Y),
                line = d3.svg.line().interpolate("linear").x(X).y(Y),
                globalYAxis = chart.globalYAxisFn(selection);

            // setting the y scale domain
            if (shareYAxis) { yScale.domain([0, globalYAxis]).nice(ytickN); }
            else {
                yScale.domain([0, d3.max(chart.getBounds(data), function(d) { return d.y; })]).nice(ytickN);
            }

            var svg = d3.select(that).append("svg")
                .attr("class", "canvas")
                .attr("width", "100%")
                .attr("height", "100%");

            var g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // background rect
            g.append('rect')
                .attr('class', 'chart-bkgd')
                .attr('width', width)
                .attr('height', height);

            g.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .selectAll('text')
                .call(chart.tickText, width)
                .on('mouseover', function(d) {
                    var hh = tip[0][0].scrollHeight;

                    mousemove = { left: d3.event.pageX, top: d3.event.pageY};
                    scrolltop = document.body.scrollTop;

                    d3.select(that).style('cursor', 'default');
                    return tip.datum(d).text(d)
                        .style('top', mousemove.top - scrolltop - hh/2 + 'px')
                        .style('left', mousemove.left + 20 + 'px')
                        .style('visibility', 'visible');
                })
                .on('mouseout', function() {
                    d3.select(that).classed('hover', false).style('stroke', null);
                    tip.style('visibility', 'hidden');
                });

            g.append("g")
                .attr("class", "y axis")
                .call(yAxis);

            // Axis labels
            g.append('text')
                .attr('class', 'x-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', height + 30)
                .text(xAxisLabel);

            g.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', -height / 2)
                .attr('y', -40)
                .attr('dy', '.75em')
                .attr('transform', 'rotate(-90)')
                .text(yAxisLabel);

            // Chart title
            g.append('text')
                .attr('class', 'charts-label')
                .attr('text-anchor', 'middle')
                .attr('x', width / 2)
                .attr('y', -10)
                .text(label)
                .call(chart.tickText, width)
                .on('mouseover', function(d) {
                    var hh = tip[0][0].scrollHeight;

                    mousemove = { left: d3.event.pageX, top: d3.event.pageY};
                    scrolltop = document.body.scrollTop;

                    d3.select(that).style('cursor', 'default');
                    return tip.text(d.label)
                        .style('top', mousemove.top - scrolltop - hh/2 + 'px')
                        .style('left', mousemove.left + 20 + 'px')
                        .style('visibility', 'visible');
                })
                .on('mouseout', function() {
                    d3.select(that).classed('hover', false).style('stroke', null);
                    tip.style('visibility', 'hidden');
                });

            var lines = g.selectAll(".lines")
                .data(seriesData)
                .enter().append("g")
                .attr("class", "lines");

            lines.append("path")
                .attr("d", function(d) { return line(d.values); })
                .attr("fill", "none")
                .style("stroke", function(d) { return d.label ? chart.colorObj[d.label] : chart.colorObj[yAxisLabel]; })
                .style("stroke-width", "3px");

            lines.append("path")
                .attr("d", function(d) { return area(d.values); })
                .style("fill", function(d) {
                    return d.label ? chart.colorObj[d.label] : chart.colorObj[yAxisLabel];
                })
                .style("stroke", function(d) { return d.label ? chart.colorObj[d.label] : chart.colorObj[yAxisLabel]; })
                .style("stroke-width", "3px")
                .style("opacity", 0.5);

            var layer = g.selectAll(".layer")
                .data(seriesData)
                .enter().append("g")
                .attr("class", function(d) { return "r" + d.label; })
                .attr("stroke", function(d) { return d.label ? chart.colorObj[d.label] : chart.colorObj[yAxisLabel]; });

            var circle = layer.selectAll(".points")
                .data(function(d) { return d.values; })
                .enter().append("circle")
                .attr("class", "points")
                .attr("cx", function(d) { return xScale(d.x); })
                .attr("cy", function(d) { return yScale(d.y); })
                /* css styling */
                .attr("r", 8)
                .attr("fill", "#ffffff")
                .attr("stroke-width", 3.5)
                .attr("opacity", 0)
                .on("mouseover", function(d, i) {
                    var point = d3.select(this);
                    point.attr("opacity", 0.5);

                    d3.select(this)
                        .classed('hover', true)
                        .style('stroke', '#333')
                        .style('cursor', 'pointer');

                    dispatch.hover({
                        value: yValue(d, i),
                        point: d,
                        pointIndex: i,
                        series: data.series,
                        config: args,
                        data: latestData,
                        e: d3.event
                    });
                    d3.event.stopPropagation();
                })
                .on("mousemove", function(d) {
                    var datum, hh = tip[0][0].scrollHeight;

                    mousemove = { left: d3.event.pageX, top: d3.event.pageY};
                    scrolltop = document.body.scrollTop;

                    if (typeof d.label !== 'undefined') {
                        datum = { label: d.label, x: d.x, y: d.y };
                    } else {
                        datum = { x: d.x, y: d.y };
                    }

                    tip.datum(datum)
                        .text(tooltipFormatter)
                        .style('top', mousemove.top - scrolltop - hh/2 + 'px')
                        .style('left', mousemove.left + 20 + 'px')
                        .style('visibility', 'visible');
                })
                .on('click', function (d, i) {
                    dispatch.click({
                        value: yValue(d, i),
                        point: d,
                        pointIndex: i,
                        series: data.series,
                        config: args,
                        data: latestData,
                        e: d3.event
                    });
                    d3.event.stopPropagation();
                })
                .on("mouseout", function() {
                    var point = d3.select(this);
                    point.attr("opacity", 0);
                    tip.style('visibility', 'hidden');
                });

            if (addTooltip) {
                // **** hilite series on hover
                allLayers = vis.select('path');
                //var allLayers = svg.selectAll('.rect');
                lines.on(
                    'mouseover', function (d, i) {

                        // hilite chart layer
                        allLayers.style('opacity', 0.3);
                        var layerClass = '.' + d3.select(this).node().classList[2],
                            mylayer = vis.selectAll(layerClass).style('opacity', 1);

                        // stroke this rect
                        d3.select(this)
                            .classed('hover', true)
                            .style('stroke', '#333')
                            .style('cursor', 'pointer');

                        // hilite legend item
                        if (allItms) {
                            allItms.style('opacity', 0.3);
                            var itm = d3.select('.legendwrapper').select('li.legends' + layerClass).style('opacity', 1);
                        }
                    });
            }

            /* Event Selection: BRUSH */
            brush = d3.svg.brush()
                .x(xScale)
                .on('brushend', function brushend() {
                    var selected, start, lastVal, end, selectedRange;

                    // selected is used to determine the range for ordinal scales
                    selected = xScale.domain().filter(function(d) {
                        return (brush.extent()[0] <= xScale(d)) && (xScale(d) <= brush.extent()[1]);
                    });

                    start = selected[0];
                    lastVal = selected.length - 1;
                    end = selected[lastVal];
                    selectedRange = [start, end];

                    return brush.extent()[0] instanceof Date ?
                        dispatch.brush({
                            range: brush.extent(),
                            config: args,
                            e: d3.event,
                            data: latestData
                        }) :
                        dispatch.brush({
                            range: selectedRange,
                            config: args,
                            e: d3.event,
                            data: latestData
                        });
                });

            if (dispatch.on('brush')) {
                g.append('g')
                    .attr('class', 'brush')
                    .call(brush)
                    .selectAll('rect')
                    .attr('height', height);
            }
            /* ************************** */

            lines.on("mouseout", function() {
                allLayers.style('opacity', 1);
                allItms.style('opacity', 1);
            });

            function X(d) { return xScale(d.x); }
            function Y(d) { return yScale(d.y); }

            return svg;
        };

        // getters / setters
        chart.resize = _.debounce(function() {
            if (latestData) {
                chart.render(latestData);
            }
        }, 200);

        // enable auto-resize
        var prevSize;
        (function checkSize() {
            var size = $elem.width() + ':' + $elem.height();
            if (prevSize !== size) {
                chart.resize();
            }
            prevSize = size;
            setTimeout(checkSize, 250);
        }());

        /* Function for truncating x axis tick labels */
        chart.tickText = function (text, width) {
            var n = text[0].length,
                maxw = width / n * 0.9,
                tickn = Math.floor(maxw);
            text.each(function () {
                var text = d3.select(this),
                    length = this.getComputedTextLength(),
                    tspan = text.text();
                if ( length > maxw ) {
                    var str = text.text(),
                        avg = length / str.length,
                        end = Math.floor(maxw / avg);
                    str = str.substr(0, end) + '...';
                    tspan = text.text(str);
                }
            });
        };

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

        chart.error = function() {
            // Removes the legend container
            d3.select(elem).selectAll('*').remove();

            var errorWrapper = d3.select(elem).append('div')
                .attr('class', 'errorWrapper')
                .style('height', function() { return $(elem).height() + 'px'; })
                .style('text-align', 'center');

            errorWrapper.append('p')
                .style('font-size', '18px')
                .style('margin-top', function() { return $(elem).height() / 3 + 'px'; })
                .style('line-height', '18px')
                .text('The container is too small for this chart.');
            return chart;
        };

        chart.off = function(event) {
            dispatch.on(event, null);
            return chart;
        };

        chart.destroy = function(_) {
            /*
             Destroys all charts associated with the parent element
             if the argument passed is true. By default the argument
             is true.
             */
            if (!arguments.length || _) {
                destroyFlag = _ || true;

                // Removing chart and all elements associated with it
                d3.select(elem).selectAll('*').remove();

                // Cleaning up event listeners
                chart.off('click');
                chart.off('hover');
                chart.off('brush');
                d3.select(window).on('resize', null);
            }
            destroyFlag = _;
            return chart;
        };

        chart.dispatch = dispatch;

        d3.rebind(chart, dispatch, 'on');
        d3.select(window).on('resize', chart.resize);

        return chart;
    };
});
