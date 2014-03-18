
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
