(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.k4 = factory();
    }
}(this, function() {
    var k4 = { version: '0.0.0' };

/*
 * Main module
 * Accepts an html element and a config object.
 * Calls all other K4 modules.
 * Returns the charting function.
 */

k4.Chart = function(elem, args) {
    'use strict';

    if (typeof(k4[args.type]) !== 'function') { throw args.type + " is not a supported k4 function."; }

    var type = args.type,
        chartFunc = k4[type](elem, args);

    return chartFunc;
};


k4.tooltip = function() {
    'use strict';

    // Based on Justin Palmer's d3.tip() function

    var direction = d3_tip_direction,
        offset    = d3_tip_offset,
        html      = d3_tip_html,
        node      = initNode(),
        svg       = null,
        point     = null,
        target    = null;

    function tip(vis) {
        svg = getSVGNode(vis);
        point = svg.createSVGPoint();
        document.body.appendChild(node);
    }

    // Public - show the tooltip on the screen
    //
    // Returns a tip
    tip.show = function() {
        var args = Array.prototype.slice.call(arguments);
        if(args[args.length - 1] instanceof SVGElement) { target = args.pop(); }

        var content = html.apply(this, args),
            poffset = offset.apply(this, args),
            dir     = direction.apply(this, args),
            nodel   = d3.select(node),
            i       = directions.length,
            coords;

        nodel.html(content)
            .style({ opacity: 1, 'pointer-events': 'all' });

        while(i--) nodel.classed(directions[i], false);
        coords = direction_callbacks.get(dir).apply(this);
        nodel.classed(dir, true).style({
            top: (coords.top +  poffset[0]) + 'px',
            left: (coords.left + poffset[1]) + 'px'
        });

        return tip;
    };

    // Public - hide the tooltip
    //
    // Returns a tip
    tip.hide = function() {
        var nodel = d3.select(node);
        nodel.style({ opacity: 0, 'pointer-events': 'none' });
        return tip;
    };

    // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
    //
    // n - name of the attribute
    // v - value of the attribute
    //
    // Returns tip or attribute value
    tip.attr = function(n, v) {
        if (arguments.length < 2 && typeof n === 'string') {
            return d3.select(node).attr(n);
        } else {
            var args =  Array.prototype.slice.call(arguments);
            d3.selection.prototype.attr.apply(d3.select(node), args);
        }

        return tip;
    };

    // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
    //
    // n - name of the property
    // v - value of the property
    //
    // Returns tip or style property value
    tip.style = function(n, v) {
        if (arguments.length < 2 && typeof n === 'string') {
            return d3.select(node).style(n)
        } else {
            var args =  Array.prototype.slice.call(arguments);
            d3.selection.prototype.style.apply(d3.select(node), args);
        }

        return tip;
    };

    // Public: Set or get the direction of the tooltip
    //
    // v - One of n(north), s(south), e(east), or w(west), nw(northwest),
    //     sw(southwest), ne(northeast) or se(southeast)
    //
    // Returns tip or direction
    tip.direction = function(v) {
        if (!arguments.length) { return direction; }
        direction = v === null ? v : d3.functor(v);

        return tip;
    };

    // Public: Sets or gets the offset of the tip
    //
    // v - Array of [x, y] offset
    //
    // Returns offset or
    tip.offset = function(v) {
        if (!arguments.length) { return offset; }
        offset = v === null ? v : d3.functor(v);

        return tip;
    };

    // Public: sets or gets the html value of the tooltip
    //
    // v - String value of the tip
    //
    // Returns html value or tip
    tip.html = function(v) {
        if (!arguments.length) { return html; }
        html = v === null ? v : d3.functor(v);

        return tip;
    };

    function d3_tip_direction() { return 'n'; }
    function d3_tip_offset() { return [0, 0]; }
    function d3_tip_html() { return ' '; }

    var direction_callbacks = d3.map({
            n:  direction_n,
            s:  direction_s,
            e:  direction_e,
            w:  direction_w,
            nw: direction_nw,
            ne: direction_ne,
            sw: direction_sw,
            se: direction_se
        }),

        directions = direction_callbacks.keys();

    function direction_n() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.n.y - node.offsetHeight,
            left: bbox.n.x - node.offsetWidth / 2
        };
    }

    function direction_s() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.s.y,
            left: bbox.s.x - node.offsetWidth / 2
        };
    }

    function direction_e() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.e.y - node.offsetHeight / 2,
            left: bbox.e.x
        };
    }

    function direction_w() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.w.y - node.offsetHeight / 2,
            left: bbox.w.x - node.offsetWidth
        };
    }

    function direction_nw() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.nw.y - node.offsetHeight,
            left: bbox.nw.x - node.offsetWidth
        };
    }

    function direction_ne() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.ne.y - node.offsetHeight,
            left: bbox.ne.x
        };
    }

    function direction_sw() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.sw.y,
            left: bbox.sw.x - node.offsetWidth
        };
    }

    function direction_se() {
        var bbox = getScreenBBox();
        return {
            top:  bbox.se.y,
            left: bbox.e.x
        };
    }

    function initNode() {
        var node = d3.select(document.createElement('div'));
        node.style({
            position: 'absolute',
            top: 0,
            opacity: 0,
            'pointer-events': 'none',
            'box-sizing': 'border-box'
        });

        return node.node();
    }

    function getSVGNode(el) {
        el = el.node();
        if(el.tagName.toLowerCase() === 'svg') { return el; }

        return el.ownerSVGElement
    }

    // Private - gets the screen coordinates of a shape
    //
    // Given a shape on the screen, will return an SVGPoint for the directions
    // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
    // sw(southwest).
    //
    //    +-+-+
    //    |   |
    //    +   +
    //    |   |
    //    +-+-+
    //
    // Returns an Object {n, s, e, w, nw, sw, ne, se}
    function getScreenBBox() {
        var targetel   = target || d3.event.target,
            bbox       = {},
            matrix     = targetel.getScreenCTM(),
            tbbox      = targetel.getBBox(),
            width      = tbbox.width,
            height     = tbbox.height,
            x          = tbbox.x,
            y          = tbbox.y,
            scrollEl   = document.documentElement ? document.documentElement : document.body,
            scrollTop  = scrollEl.scrollTop,
            scrollLeft = scrollEl.scrollLeft;


        point.x = x + scrollLeft;
        point.y = y + scrollTop;
        bbox.nw = point.matrixTransform(matrix);
        point.x += width;
        bbox.ne = point.matrixTransform(matrix);
        point.y += height;
        bbox.se = point.matrixTransform(matrix);
        point.x -= width;
        bbox.sw = point.matrixTransform(matrix);
        point.y -= height / 2;
        bbox.w  = point.matrixTransform(matrix);
        point.x += width;
        bbox.e = point.matrixTransform(matrix);
        point.x -= width / 2;
        point.y -= height / 2;
        bbox.n = point.matrixTransform(matrix);
        point.y += height;
        bbox.s = point.matrixTransform(matrix);

        return bbox;
    }

    return tip;
};k4.legend = function(g) {
    'use strict';

    g.each(function() {
        var g = d3.select(this),
            items = {},
            svg = d3.select(g.property("nearestViewportElement")),
            legendPadding = g.attr("data-style-padding") || 5,
            lb = g.selectAll(".legend-box").data([true]),
            li = g.selectAll(".legend-items").data([true]),
            lbbox;

        lb.enter().append("rect").classed("legend-box",true);
        li.enter().append("g").classed("legend-items",true);

        svg.selectAll("[data-legend]").each(function() {
            var self = d3.select(this);
            items[self.attr("data-legend")] = {
                pos : self.attr("data-legend-pos") || this.getBBox().y,
                color : self.attr("data-legend-color") !== null ? self.attr("data-legend-color") :
                    self.style("fill") !== 'none' ? self.style("fill") : self.style("stroke")
            };
        });

        items = d3.entries(items).sort(function(a, b) { return a.value.pos - b.value.pos; });

        /*
        li.selectAll('div')
            .data(items, function(d) { return d.key; })
            .call(function(d) { d.enter().append("div"); })
            .call(function(d) { d.exit().remove(); })
            .attr("class", "legend-div");
        */

        li.selectAll("text")
            .data(items, function(d) { return d.key; })
            .call(function(d) { d.enter().append("text"); })
            .call(function(d) { d.exit().remove(); })
            .attr("class", "legend-text")
            .attr("x", "0.7em")
            .attr("y", function(d, i) { return i + "em"; })
            .text(function(d) { return d.key; });

        li.selectAll("circle")
            .data(items, function(d) { return d.key; })
            .call(function(d) { d.enter().append("circle"); })
            .call(function(d) { d.exit().remove(); })
            .attr("class", "legend-circle")
            .attr("cx", 0)
            .attr("cy", function(d, i) { return i - 0.25 + "em"; })
            .attr("r", "0.4em")
            .style("fill", function(d) { return d.value.color; });

        // Reposition and resize the box
        lbbox = li[0][0].getBBox();

        lb.attr("x", (lbbox.x - legendPadding))
            .attr("y", (lbbox.y - legendPadding))
            .attr("height", (lbbox.height + 2 * legendPadding))
            .attr("width", (lbbox.width + 2 * legendPadding));
    });

    return g;
};
k4.histogram = function(elem, args) {
    'use strict';

    var chart = {},

        /* ********** Sizing DOM Elements ************* */
        // accessing the element width/height
        elemWidth = parseInt(d3.select(elem).style("width"), 10),
        elemHeight = parseInt(d3.select(elem).style("padding-bottom"), 10),
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
        // defines the stack.offset()
        stacktype = args.stacktype || 'zero',       // 'zero', 'expand', 'group'
        stack = d3.layout.stack().offset(stacktype).values(function(d) { return d.values; }),
        // calculates the y-axis max value for all charts, i.e. grouped and stacked
        yGroup = args.yGroup || false,
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
        color = d3.scale.linear().domain([0, m - 1]).range(args.color) ||
            d3.scale.linear().domain([0, m - 1]).range(['#e24700', '#f9e593']),
        toolTip = k4.tooltip().attr('class', 'k4-tip').html(function(d) {
            if (d.y < 1) { return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y.toFixed(2) * 100 + '%</span>'; }
            return '<span>x: ' + d.x + '</span><br><span>y: ' + d.y + '</span>';
        }).offset([-12, 0]),
        svg, g, layer;
        /* ******************************************************** */

    chart.render = function(data) {

        // append svg(s)
        svg = getSvg(elem, data);

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
                console.log(yMax);
                console.log(yGroupMax);

                var yStack = d3.max(d.layers, function(d) {
                    return d3.max(d.values, function(e) {
                        return e.y0 + e.y;
                    });
                });

                // Change y/xScale domain based on stacktype
                if (stacktype === 'expand') { yScale.domain([0, 1]); }

                if (stacktype === 'group' && yGroup) {
                    xScale.rangeRoundBands([0, width], 0.2);
                    yScale.domain([0, yGroupMax]);
                } else {
                    xScale.rangeRoundBands([0, width], 0.2);
                    yScale.domain([0, yMax]);
                }

                if (stacktype === 'zero' && yGroup) {
                    yScale.domain([0, yStackMax]);
                } else {
                    yScale.domain([0, yStack]);
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

        svg = cols.append('svg')
            .attr("width", outerWidth/n)
            .attr("height", outerHeight);

        return svg;
    }

    function resize() {
        /* Update graph using new width and height */
        var elemWidth = parseInt(d3.select(elem).style("width"), 10),
            elemHeight = parseInt(d3.select(elem).style("padding-bottom"), 10),
            outerWidth = elemWidth / n,
            outerHeight = elemHeight / numRows,
            width = outerWidth - margin.left - margin.right,
            height = outerHeight - margin.top - margin.bottom;

        d3.select(".row r").style("width", elemWidth).style("height", outerHeight);
        d3.select(".col c").style ("width", outerWidth).style("height", outerHeight);
        svg.attr("width", outerWidth).attr("height", outerHeight);

        g.each(function(d) {
            var g = d3.select(this);

            var yMax = d3.max(d.layers, function(d) { return d3.max(d.values, function(e) { return e.y; }); });
            var yStack = d3.max(d.layers, function(d) { return d3.max(d.values, function(e) { return e.y0 + e.y; }); });

            // Change y/xScale domain based on stacktype
            // Change y/xScale domain based on stacktype
            if (stacktype === 'expand') { yScale.domain([0, 1]); }

            if (stacktype === 'group' && yGroup) {
                yScale.domain([0, yGroupMax]);
                xScale.rangeRoundBands([0, width], 0.2);
            } else {
                yScale.domain([0, yMax]);
                xScale.rangeRoundBands([0, width], 0.2);
            }

            if (stacktype === 'zero' && yGroup) {
                yScale.domain([0, yStackMax]);
            } else {
                yScale.domain([0, yStack]);
            }

            /* Update the range of the scale with new width/height */
            if (stacktype === "group") { xScale.rangeRoundBands([0, width], 0.4); }
            else { xScale.rangeRoundBands([0, width], 0.1); }
            yScale.range([height, 0]).nice();
            xAxis.ticks(Math.max(width/50, 2));
            yAxis.ticks(Math.max(height/20, 2)).tickSize(-(width), 0);

            if (width < 300 && height < 80) {
                g.select('.x.axis').style('display', 'none');
            } else {
                g.select('.x.axis').style('display', 'initial');
                g.select('.y.axis').style('display', 'initial');
            }

            g.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            g.selectAll(".bkgd").attr("width", width).attr("height", height);

            /* Update the axis with the new scale */
            g.select('.x.axis')
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            g.select('.y.axis')
                .call(yAxis);

            /* Force D3 to recalculate and update the line */
            if (stacktype === "group") {
                layer.selectAll("rect")
                    .attr( "x", function (d, i, j) { return xScale(d.x) + xScale.rangeBand() / n * j; })
                    .attr("width", xScale.rangeBand() / n)
                    .attr( "y", function (d) { return yScale(d.y); })
                    .attr( "height", function (d) { return height - yScale(d.y); });
            }

            g.selectAll('rect')
                .attr("width", xScale.rangeBand())
                .attr("x", function(d) { return xScale(d.x); })
                .attr("height", function(d) { return yScale(d.y0) - yScale(d.y0 + d.y); })
                .attr("y", function(d) { return yScale(d.y0 + d.y); });
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
};    return k4;
}));