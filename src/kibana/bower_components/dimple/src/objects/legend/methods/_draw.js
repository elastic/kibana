        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/legend/methods/_draw.js
        // Render the legend
        this._draw = function () {

            // Create an array of distinct color elements from the series
            var legendArray = this._getEntries(),
                maxWidth = 0,
                maxHeight = 0,
                runningX = 0,
                runningY = 0,
                keyWidth = 15,
                keyHeight = 9,
                self = this,
                theseShapes;

            // If there is already a legend remove it
            if (this.shapes) {
                this.shapes.remove();
            }

            // Create an empty hidden group for every legend entry
            // the selector here must not pick up any legend entries being removed by the
            // transition above
            theseShapes = this.chart._group
                .selectAll(".dimple-dont-select-any")
                .data(legendArray)
                .enter()
                .append("g")
                .attr("class", function (d) {
                    return "dimple-legend " + dimple._createClass(d.aggField);
                })
                .attr("opacity", 1);

            // Add text into the group
            theseShapes.append("text")
                .attr("class", function (d) {
                    return "dimple-legend dimple-legend-text " + dimple._createClass(d.aggField);
                })
                .text(function(d) {
                    return d.key;
                })
                .call(function () {
                    if (!self.chart.noFormats) {
                        this.style("font-family", self.fontFamily)
                            .style("font-size", self._getFontSize())
                            .style("shape-rendering", "crispEdges");
                    }
                })
                .each(function () {
                    var b = this.getBBox();
                    if (b.width > maxWidth) {
                        maxWidth = b.width;
                    }
                    if (b.height > maxHeight) {
                        maxHeight = b.height;
                    }
                });

            // Add a rectangle into the group
            theseShapes.append("rect")
                .attr("class", function (d) {
                    return "dimple-legend dimple-legend-key " + dimple._createClass(d.aggField);
                })
                .attr("height", keyHeight)
                .attr("width",  keyWidth);

            // Expand the bounds of the largest shape slightly.  This will be the size allocated to
            // all elements
            maxHeight = (maxHeight < keyHeight ? keyHeight : maxHeight) + 2;
            maxWidth += keyWidth + 20;

            // Iterate the shapes and position them based on the alignment and size of the legend
            theseShapes
                .each(function (d) {
                    if (runningX + maxWidth > self._widthPixels()) {
                        runningX = 0;
                        runningY += maxHeight;
                    }
                    if (runningY > self._heightPixels()) {
                        d3.select(this).remove();
                    } else {
                        d3.select(this).select("text")
                            .attr("x", (self.horizontalAlign === "left" ? self._xPixels() + keyWidth + 5 + runningX : self._xPixels() + (self._widthPixels() - runningX - maxWidth) + keyWidth + 5))
                            .attr("y", function () {
                                // This was previously done with dominant-baseline but this is used
                                // instead due to browser inconsistency.
                                return self._yPixels() + runningY + this.getBBox().height / 1.65;
                            })
                            .attr("width", self._widthPixels())
                            .attr("height", self._heightPixels());
                        d3.select(this).select("rect")
                            .attr("class", function (d) {
                                return "dimple-legend dimple-legend-key " + dimple._createClass(d.aggField);
                            })
                            .attr("x", (self.horizontalAlign === "left" ? self._xPixels() + runningX : self._xPixels() + (self._widthPixels() - runningX - maxWidth)))
                            .attr("y", self._yPixels() + runningY)
                            .attr("height", keyHeight)
                            .attr("width",  keyWidth)
                            .style("fill", d.fill)
                            .style("stroke", d.stroke)
                            .style("opacity", d.opacity)
                            .style("shape-rendering", "crispEdges");
                        runningX += maxWidth;
                    }
                });

            // Assign them to the public property for modification by the user.
            this.shapes = theseShapes;
        };
