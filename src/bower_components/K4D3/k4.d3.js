(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.k4 = factory();
    }
}(this, function() {
    var k4 = {};
k4.version = '0.0.0';

k4.namespace = function (ns_string) {
    'use strict';

    var parts = ns_string.split('.'),
        parent = k4,
        i;

    // strip redundant leading global
    if (parts[0] === 'k4') {
        parts = parts.slice(1);
    }

    for (i = 0; i < parts.length; i += 1) {
        // create a property if it doesn't exist
        if (typeof parent[parts[i]] === 'undefined') {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }

    return parent;
};

k4.mouseover = function (config) {
    'use strict';

    var selection = config.selection,
        data = config.data || data,
        xScale = config.xScale || xScale,
        yScale = config.yScale || yScale,
        width = config.width || innerWidth,
        height = config.height || innerHeight,
        focus = selection.append('g')
            .attr('class', 'focus')
            .style('display', 'none');
    
    var tip = d3.select('#tip');
    
    focus.append('circle')
        .attr('r', 4.5);

    focus.append('text')
        .attr('x', 9)
        .attr('dy', '.35em');

    focus.append('div')
        .attr('class', 'tooltip')
        .attr('x', 9)
        .attr('dy', '.35em');

    selection.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', function() {
            focus.style('display', null);
        })
        .on('mouseout', function() {
            focus.style('display', 'none');
        })
        .on('mousemove', mousemove);

    var tip = selection.append('rect')
        .attr('class', 'tooltip')
        .attr('width', 150)
        .attr('height', 50);


    function mousemove() {
        var x0 = xScale.invert(d3.mouse(this)[0]),
            bisectDate = d3.bisector(function(d) { return d[0]; }).left,
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            last = data.length - 1,
            d = last === data.indexOf(d0) ? d0 : x0 - d0[0] > d1[0] - x0 ? d1 : d0;
        focus.attr("transform", "translate(" + xScale(d[0]) + "," + yScale(d[1]) + ")");
        focus.select('text').text(d[0] + ", " + d[1]);
        focus.select('div').attr('visibility', 'visible');


        //tip.attr('visibility', 'visible')
        console.log( 'mousemove', xScale(d[0]), yScale(d[1]) );
        tip.attr("x", function() {
            return xScale(d[0]);//+'px';
        })
        .attr("y", function() {
            return yScale(d[1]);//+'px';
        })
        .style("fill", "#333");


    }
};

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

k4.dendrogram = function() {
    'use strict';

    var width = 600,
        height = 2000,
        color = d3.scale.category10(),
        cluster = d3.layout.cluster()
            .size([height,  width - 200]),
        diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

    function chart(selection) {
        selection.each(function(data) {
            var nodes = cluster.nodes(data),
                links = cluster.links(nodes);

            var svg = d3.select(this).append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(120,0)');

            svg.selectAll('.link')
                .data(links)
                .enter().append('path')
                .attr('class', 'link')
                .attr('d', diagonal);

            var node = svg.selectAll('.node')
                .data(nodes)
                .enter().append('g')
                .attr('class', 'node')
                .attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });

            node.append('circle')
                .attr('r', 4.5)
                .style('fill', function(d) {
                    return d.children ? '#ffffff' : color(d.name);
                })
                .style('stroke', function(d) {
                    return d.children ? '#4682B4': color(d.name);
                });

            node.append('text')
                .attr('dx', function(d) { return d.children ? -8 : 8; })
                .attr('dy', 3)
                .style('text-anchor', function(d) { return d.children ? 'end' : 'start'; })
                .text(function(d) { return d.name; });
        });
    }

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
        color = _;
        return chart;
    };

    chart.cluster = function(_) {
        if (!arguments.length) { return cluster; }
        cluster = _;
        return chart;
    };

    chart.diagonal = function(_) {
        if (!arguments.length) { return diagonal; }
        diagonal = _;
        return chart;
    };

    return chart;
};

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
k4.horizon = function() {
    'use strict';

    // Based on d3.horizon plugin by Jason Davies
    var width = 960,
        height = 40,
        bands = 1,
        duration = 0,
        mode = 'offset', // or mirror
        interpolate = 'linear', // or basis, monotone, step-before, etc.
        x = function(d) { return d[0]; },
        y = function(d) { return d[1]; },
        d3_horizonArea = d3.svg.area(),
        d3_horizonId = 0,
        color = d3.scale.linear()
            .domain([-1, 0, 0, 1])
            .range(['#08519c', '#bdd7e7', '#bae4b3', '#006d2c']);

    // For each small multiple…
    function horizon(selection) {
        selection.each(function(d) {
            var g = d3.select(this),
                //n = 2 * bands + 1,
                xMin = Infinity,
                xMax = -Infinity,
                yMax = -Infinity,
                x0, // old x-scale
                y0, // old y-scale
                id; // unique id for paths

            // Compute x- and y-values along with extents.
            var data = d.map(function(d, i) {
                var xValue = x.call(this, d, i),
                    yValue = y.call(this, d, i);

                if (xValue < xMin) { xMin = xValue; }
                if (xValue > xMax) { xMax = xValue; }
                if (-yValue > yMax) { yMax = -yValue; }
                if (yValue > yMax) { yMax = yValue; }

                return [xValue, yValue];
            });

            // Compute the new x- and y-scales, and transform.
            var x1 = d3.scale.linear().domain([xMin, xMax]).range([0, width]),
                y1 = d3.scale.linear().domain([0, yMax]).range([0, height * bands]),
                t1 = d3_horizonTransform(bands, height, mode), t0;

            // Retrieve the old scales, if this is an update.
            if (this.__chart__) {
                x0 = this.__chart__.x;
                y0 = this.__chart__.y;
                t0 = this.__chart__.t;
                id = this.__chart__.id;
            } else {
                x0 = x1.copy();
                y0 = y1.copy();
                t0 = t1;
                id = ++d3_horizonId;
            }

            g.append('rect')
                .attr('width', width)
                .attr('height', height);

            // We'll use a defs to store the area path and the clip path.
            // defs are graphical objects to be defined for later reuse.
            var defs = g.selectAll('defs')
                .data([null]);

            // The clip path is a simple rect.
            defs.enter().append('defs').append('clipPath')
                .attr('id', 'd3_horizon_clip' + id)
                .append('rect')
                .attr('width', width)
                .attr('height', height);

            defs.select('rect').transition()
                .duration(duration)
                .attr('width', width)
                .attr('height', height);

            // We'll use a container to clip all horizon layers at once.
            g.selectAll('g')
                .data([null])
                .enter().append('g')
                .attr('clip-path', 'url(#d3_horizon_clip' + id + ')');

            // Instantiate each copy of the path with different transforms.
            var path = g.select('g').selectAll('path')
                .data(d3.range(-1, -bands - 1, -1).concat(d3.range(1, bands + 1)), Number);

            var d0 = d3_horizonArea
                .interpolate(interpolate)
                .x(function(d) { return x0(d[0]); })
                .y0(height * bands)
                .y1(function(d) { return height * bands - y0(d[1]); })
                (data);

            var d1 = d3_horizonArea
                .x(function(d) { return x1(d[0]); })
                .y1(function(d) { return height * bands - y1(d[1]); })
                (data);

            path.enter().append('path')
                .style('fill', color)
                .attr('transform', t0)
                .attr('d', d0);

            path.transition()
                .duration(duration)
                .style('fill', color)
                .attr('transform', t1)
                .attr('d', d1);

            path.exit().transition()
                .duration(duration)
                .attr('transform', t1)
                .attr('d', d1)
                .remove();

            // Stash the new scales.
            this.__chart__ = {x: x1, y: y1, t: t1, id: id};
        });

        d3.timer.flush();
    }

    function d3_horizonTransform(bands, height, mode) {
        return mode === 'offset' ? function(d) { return 'translate(0,' + (d + (d < 0) - bands) * height + ')'; }
            : function(d) { return (d < 0 ? 'scale(1,-1)' : '') + 'translate(0,' + (d - bands) * height + ')'; };
    }

    horizon.duration = function(_) {
        if (!arguments.length) { return duration; }
        duration = +_;
        return horizon;
    };

    horizon.bands = function(_) {
        if (!arguments.length) { return bands; }
        bands = +_;
        color.domain([-bands, 0, 0, bands]);
        return horizon;
    };

    horizon.mode = function(_) {
        if (!arguments.length) { return mode; }
        mode = _ + '';
        return horizon;
    };

    horizon.colors = function(_) {
        if (!arguments.length) { return color.range(); }
        color.range(_);
        return horizon;
    };

    horizon.interpolate = function(_) {
        if (!arguments.length) { return interpolate; }
        interpolate = _ + '';
        return horizon;
    };

    horizon.x = function(_) {
        if (!arguments.length) { return x; }
        x = _;
        return horizon;
    };

    horizon.y = function(_) {
        if (!arguments.length) { return y; }
        y = _;
        return horizon;
    };

    horizon.width = function(_) {
        if (!arguments.length) { return width; }
        width = +_;
        return horizon;
    };

    horizon.height = function(_) {
        if (!arguments.length) { return height; }
        height = +_;
        return horizon;
    };

    return horizon;
};

k4.line = function() {
    'use strict';

    var margin = {top: 20, right: 50, bottom: 50, left: 50},
        width = 760,
        height = 120,
        getX = function(d) { return d[0]; },
        getY = function(d) { return d[1]; },
        getZ = function(d) { return d[2]; },
        interpolate = 'cardinal',
        xScale = d3.time.scale(),
        yScale = d3.scale.linear(),
        xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('bottom')
            .ticks(10)
            .tickPadding(6),
        yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left')
            .ticks(10)
            .tickPadding(6),
        line = d3.svg.line()
            .x(function(d) { return xScale(d.x); })
            .y(function(d) { return yScale(d.y); }),
        color = d3.scale.category10();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom;

            data = data.map(function(d, i) {
                return [getX.call(data, d, i), getY.call(data, d, i), getZ.call(data, d, i)];
            });

            xScale
                .domain(d3.extent(data, function(d) { return d[0]; })).nice()
                .range([0, width - margin.left - margin.right]);

            yScale
                .domain([0, d3.max(data, function(d) { return d[1]; })]).nice()
                .range([height - margin.top - margin.bottom, 0]);

            line.interpolate(interpolate);

            color.domain(data.map(function(d) { return d[2]; }));

            var groups = color.domain().map(function(name) {
                data.forEach(function(d) {
                    console.log(d[2] === name);
                    if (d[2] === name) {
                        return {
                            name: name,
                            values: {x: d[0], y: d[1]}
                        };
                    }
                });
            });
            console.log(groups);

            var svg = d3.select(this).selectAll('svg').data([data]);

            var gEnter = svg.enter().append('svg').append('g');
            gEnter.append('rect').attr('class', 'background');
            gEnter.append('g').attr('class', 'line');
            gEnter.append('g').attr('class', 'x axis');
            gEnter.append('g').attr('class', 'y axis');
            gEnter.append('g').attr('class', 'points');

            svg
                .attr('width', width)
                .attr('height', height);

            var g = svg.select('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            // Circles
            g.select('.points').selectAll('.points').append('circle')
                .data(data)
                .enter().append('circle')
                .attr('class', 'points')
                .attr('cx', X)
                .attr('cy', Y)
                .attr('r', 4.5)
                .style('fill', 'white')
                .style('fill-opacity', function () {
                    return 1;
                })
                .style('stroke', function(d) {
                    return typeof color === 'object' ? color[d] : color(d[2]);
                })
                .style('stroke-width', function () {
                    return 1.5;
                });

            g.select('.background')
                .attr('width', innerWidth)
                .attr('height', innerHeight);

            g.select('.line').selectAll('.series').data(groups)
                .enter().append('path')
                .attr('class', 'series')
                .attr('d', function(d) { return line(d.values); })
                .attr('fill', 'none')
                .attr('stroke', function(d) {
                    return typeof color === 'object' ? color[d.name] : color(d.name);
                })
                .attr('stoke-width', 3);

            g.select('.x.axis')
                .attr('transform', 'translate(0,' + yScale.range()[0] + ')')
                .call(xAxis.tickSize(-innerHeight));

            g.select('.y.axis')
                .call(yAxis.tickSize(-innerWidth));
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

    chart.z = function(_) {
        if (!arguments.length) { return getZ; }
        getZ = _;
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

k4.map = function() {
    'use strict';

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        width = 600,
        height = 600,
        scale = 245,
        shading = false,
        labels = true,
        watercolor = "#ddd",
        countrycolor = "#ddd",
        pointcolor = "#ddd",
        rotate = [52.8, -49.6],
        colorScale = d3.scale.quantile();

    function chart(selection) {
        selection.each(function(data) {

            var innerWidth = width - margin.left - margin.right,
                innerHeight = height - margin.top - margin.bottom;

            var svg = d3.select(this).selectAll('svg').data([0]);
            svg.enter().append('svg').attr('width', width)
                .attr('height', height);
            
            // map vars
            var colors = ['#ffebbc','#f8d294','#f2b96e','#ed9d4c','#e97f2e','#e55c13','#e02c00'];
            var colorScale = d3.scale.quantile()
                .domain([ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0 ])
                .range(colors);

            // projection
            var projection = d3.geo.orthographic()
                .scale(scale)
                .translate([width/2, height/2])
                .precision(0.1)
                .rotate(rotate)
                .clipAngle(90)
                .clipExtent([[1, 1], [width - 1, height - 1]]);
                
            // scales for fading/sizing labels/points
            var opacityScale = d3.scale.linear()
                .domain([200, 150])
                .range([1,0]);

            var ptSizeScale = d3.scale.linear()
                .domain([500, 150])
                .range([12,7]);

            var path = d3.geo.path().projection(projection).pointRadius(2);

            var graticule = d3.geo.graticule();

            // map data
            var land = data[0];
            var countries = data[1];
            var places = data[2];
            
            //var win = d3.select(window)
            //    .on('mousemove', mouseMove)
            //    .on('mouseup', mouseUp);

            svg.on('mousemove', mouseMove)
                .on('mouseup', mouseUp)
                .on('mousedown', mouseDown)
                .call(d3.behavior.zoom()
                    .translate(projection.translate())
                    .scale(projection.scale())
                    .scaleExtent([50,500])
                    .on('zoom', function() {
                        reZoom();
                    })
                );

            // shading def
            var globe_shading = svg.append("defs")
                .append("radialGradient")
                .attr("id", "globe_shading")
                .attr("cx", "50%")
                .attr("cy", "40%");
            globe_shading.append("stop")
                .attr("offset","50%")
                .attr("stop-color", "#fff")
                .attr("stop-opacity","0.2");
            globe_shading.append("stop")
                .attr("offset","100%")
                .attr("stop-color", "#253d56")
                .attr("stop-opacity","0.4");

            // water sphere
            svg.append("path")
                .datum({type: "Sphere"})
                .attr("class", "water noclick")
                .style('fill', watercolor)
                .attr("d", path);

            // graticule
            svg.append('path')
                .datum(graticule)
                .attr('class', 'graticule noclick')
                .attr('d', path);

            // land shape
            svg.append('path')
                .datum(land)
                .attr('class', 'land noclick')
                .attr('d', path);

            // shading sphere - optional
            if (shading) {
                svg.append('path')
                    .datum({type: 'Sphere'})
                    .attr('class','noclick')
                    .style('fill', 'url(#globe_shading)');
            }
                
            // country shapes    
            svg.append('g')
                .attr('class', 'countries')
                .selectAll('path')
                .data(countries)
                .enter().append('path')
                .attr('class', 'countries')
                .attr('d', path)
                .style('fill', countrycolor)
                .on('mouseover', function(d) {
                    console.log('country id: ' + d.id);
                });

            // edge sphere
            svg.append('path')
                .datum({type: 'Sphere'})
                .attr('class', 'edge noclick')
                .attr('d', path);
            
            // place points
            svg.append('g').attr('class','points noclick')
                .selectAll('text')
                .data(places)
                .enter().append('path')
                .attr('class', 'point')
                .style('fill', pointcolor)
                .attr('d', path);

            // place labels
            svg.append('g').attr('class','labels noclick')
                .selectAll('text')
                .data(places)
                .enter().append('text')
                .attr('class', 'label')
                .text(function(d) { 
                    return d.properties.name;
                });

            reDraw();

            // 
            function positionLabels() {

                var centerPos = projection.invert([width/2,height/2]);
                var arc = d3.geo.greatArc();
                var s = projection.scale();
                
                // labels
                svg.selectAll('.label')
                    .attr('text-anchor',function(d) {
                        var x = projection(d.geometry.coordinates)[0];
                        if (x < (width/2) - 20) {
                            return 'end'; 
                        } else if (x < (width/2) + 20) {
                            return 'middle';
                        } else {
                            return 'start';
                        }
                    })
                    .attr('transform', function(d) {
                        var loc = projection(d.geometry.coordinates),
                        x = loc[0],
                        y = loc[1],
                        xoffset = 6,
                        yoffset = -3;
                        if (x < width/2) {
                            xoffset = -6;
                        }
                        if (x < (width/2) - 20) {
                            yoffset = -1;
                        } else if (x < (width/2) + 20) {
                            yoffset = -6;
                        } else {
                            yoffset = -1;
                        }
                        return 'translate(' + (x + xoffset) + ',' + (y + yoffset) + ')';
                })
                .style('opacity', function() {
                    return opacityScale(s);
                })
                .style('font-size', function() {
                    return ptSizeScale(s);
                })
                .style('display',function(d) {
                    var dist = arc.distance({source: d.geometry.coordinates, target: centerPos});
                    if (dist > 1.57) {
                        return 'none';
                    } else {
                        return 'inline';
                    }
                });

                // points
                svg.selectAll('.point')
                .style('opacity', function() {
                    return opacityScale(s);
                });
                
            }

            function reDraw() {
                svg.selectAll('path').attr('d', path);
                positionLabels();
                console.log('Map center: ', -projection.rotate()[1], -projection.rotate()[0]);
            }

            function reZoom() {
                if (d3.event) { projection.scale(d3.event.scale); }
                svg.selectAll('*')
                .attr('d', path);
                positionLabels();
                console.log('Map scale: ', d3.event.scale);
            }

            // window mousemove
            function mouseMove() {
                if (m0) {
                    // limit vertical rotation between 55 & -55
                    var m1 = [d3.event.pageX, d3.event.pageY],
                    o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
                    if (o1[1] > 55) {
                        o1[1] = 55;
                    }
                    if (o1[1] < -55) {
                        o1[1] = -55;
                    }
                    projection.rotate(o1);
                    reDraw();
                }
            }

            // window mouseup
            function mouseUp() {
                if (m0) {
                    mouseMove();
                    m0 = null;
                }
            }

            // svg mousedown
            var m0, o0;
            function mouseDown() {
                m0 = [d3.event.pageX, d3.event.pageY];
                o0 = projection.rotate();
                d3.event.preventDefault();
            }

        });
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

    chart.rotate = function(_) {
        if (!arguments.length) { return rotate; }
        rotate = _;
        return chart;
    };

    chart.scale = function(_) {
        if (!arguments.length) { return scale; }
        scale = _;
        return chart;
    };

    chart.shading = function(_) {
        if (!arguments.length) { return shading; }
        shading = _;
        return chart;
    };

    chart.labels = function(_) {
        if (!arguments.length) { return labels; }
        labels = _;
        return chart;
    };

    chart.watercolor = function(_) {
        if (!arguments.length) { return watercolor; }
        watercolor = _;
        return chart;
    };

    chart.countrycolor = function(_) {
        if (!arguments.length) { return countrycolor; }
        countrycolor = _;
        return chart;
    };

    chart.pointcolor = function(_) {
        if (!arguments.length) { return pointcolor; }
        pointcolor = _;
        return chart;
    };

    return chart;
};

k4.pie = function() {
    'use strict';

    var width = 500,
        height = 500,
        radius = Math.min(width, height)/ 2,
        sort = null,
        label = function(d) { return d[0]; },
        value = function(d) { return d[1]; },
        outerRadius = radius - 10,
        innerRadius = 0,
        color = d3.scale.category10(),
        arc = d3.svg.arc(),
        pie = d3.layout.pie();

    function chart(selection) {
        selection.each(function(data) {
            data = data.map(function(d, i) {
                return [label.call(data, d, i), value.call(data, d, i)];
            });

            arc
                .outerRadius(outerRadius)
                .innerRadius(innerRadius);

            pie
                .sort(sort)
                .value(function(d) { return d[1]; });

            var svg = d3.select(this).append('svg');

            svg
                .attr('width', width)
                .attr('height', height);

            var gEnter = svg.append('g')
                .attr('transform', 'translate(' + width/2 + ', ' + height/2 + ')');

            var g = gEnter.selectAll('.arc')
                .data(pie(data))
                .enter().append('g')
                .attr('class', 'arc')
                .style('stroke-width', 2);

            g.append('path')
                .attr('d', arc)
                .style('fill', function (d) {
                    return color(d.data[0]);
                });

            g.append('text')
                .attr('transform', function (d) { return 'translate(' + arc.centroid(d) + ')'; })
                .attr('dy', '.35em')
                .style('text-anchor', 'middle')
                .style('fill', 'white')
                .text(function(d) { console.log(d); return d.data[0]; });
        });
    }

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

    chart.radius = function(_) {
        if (!arguments.length) { return radius; }
        radius = _;
        return chart;
    };

    chart.sort = function(_) {
        if (!arguments.length) { return sort; }
        sort = _;
        return chart;
    };

    chart.label = function(_) {
        if (!arguments.length) { return label; }
        label = _;
        return chart;
    };

    chart.value = function(_) {
        if (!arguments.length) { return value; }
        value = _;
        return chart;
    };

    chart.outerRadius = function(_) {
        if (!arguments.length) { return outerRadius; }
        outerRadius = _;
        return chart;
    };

    chart.innerRadius = function(_) {
        if (!arguments.length) { return innerRadius; }
        innerRadius = _;
        return chart;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
        return chart;
    };

    return chart;
};

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

k4.spiderChart = function() {
    'use strict';

};

k4.sunburst = function() {
    'use strict';

    var width = 960,
        height = 700,
        radius = Math.min(width, height) / 2,
        color = d3.scale.category20c(),
        x = d3.scale.linear()
            .range([0, 2 * Math.PI]),
        y = d3.scale.sqrt()
            .range([0, radius]),
        value = function(d) { return 1; },
        partition = d3.layout.partition(),
        arc = d3.svg.arc()
            .startAngle(function(d) { return d.x; })
            .endAngle(function(d) { return d.x + d.dx; })
            .innerRadius(function(d) { return Math.sqrt(d.y); })
            .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

    function chart(selection) {
        selection.each(function(data) {
            var svg = d3.select(this).append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(' + width/2 + ',' + height * 0.52 + ')');

            partition
                .sort(null)
                .size([2 * Math.PI, radius * radius])
                .value(value);

            svg.datum(data).selectAll('path')
                .data(partition.nodes)
                .enter().append('path')
                .attr('display', function(d) { return d.depth ? null : "none"; })
                .attr('d', arc)
                .style('stroke', '#fff')
                .style('fill', function(d) { return color((d.children ? d : d.parent).name); })
                .style('fill-rule', 'evenodd');
        });
    }

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

    chart.radius = function(_) {
        if (!arguments.length) { return radius; }
        radius = _;
        return radius;
    };

    chart.color = function(_) {
        if (!arguments.length) { return color; }
        color = _;
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

    chart.value = function(_) {
        if (!arguments.length) { return value; }
        value = _;
        return chart;
    };

    return chart;
};

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

k4.treemap = function() {
    'use strict';

};

k4.table = function() {
    'use strict';

    var row = function(d) { return d; },
        column = function(d) { return d3.keys(d[0]); },
        columns;

    function table(selection) {
        selection.each(function(data) {

            columns = column.call(this, data);

            data = row.call(this, data);

            var table = d3.select(this).append('table')
                .attr('id', 'data-table')
                .attr('class', 'table table-striped table-bordered table-hover')
                .attr('cellpadding', 0)
                .attr('cellspacing', 0)
                .attr('border', 0)
                .style('border-collapse', 'collapse');

            var thead = table.append('thead')
                .attr('class', 'sorting');

            var tbody = table.append('tbody');
                //tfoot = table.append('tfoot');

            // append the header row
            thead.append('tr')
                .selectAll('th')
                .data(columns)
                .enter()
                .append('th')
                .text(function(column) { return column; })
                .style('border', '1px black solid')
                .style('padding', '5px');

            // create a row for each object in the data
            var rows = tbody.selectAll('tr')
                .data(data)
                .enter()
                .append('tr');

            // create a cell in each row for each column
            rows.selectAll('td')
                .data(function(row) {
                    return columns.map(function(column) {
                        return {column: column, value: row[column]};
                    });
                })
                .enter()
                .append('td')
                .text(function(d) { return d.value; })
                .style('border', '1px black solid')
                .style('padding', '5px');

            // uppercase the column headers
            table.selectAll('thead th')
                .text(function(column) {
                    return column.charAt(0).toUpperCase() + column.substr(1);
                });
        });
    }

    table.row = function(_) {
        if (!arguments.length) { return row; }
        row = _;
        return table;
    };

    table.column = function(_) {
        if (!arguments.length) { return column; }
        column = _;
        return table;
    };

    return table;
};
    return k4;
}));