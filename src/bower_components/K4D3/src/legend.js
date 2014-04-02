define(function(require) {
    "use strict";

    var d3 = require('d3');

    return function(g) {
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

});
