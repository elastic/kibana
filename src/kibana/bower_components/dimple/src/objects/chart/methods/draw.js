        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/draw.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-draw
        this.draw = function (duration, noDataChange) {
            // Deal with optional parameter
            duration = duration || 0;
            // Catch the first x and y
            var firstX = null,
                firstY = null,
                distinctCats,
                xGridSet = false,
                yGridSet = false,
                chartX = this._xPixels(),
                chartY = this._yPixels(),
                chartWidth = this._widthPixels(),
                chartHeight = this._heightPixels(),
                linkedDimensions;

            // Many of the draw methods use positioning data in each series.  Therefore we should
            // decorate the series with it now
            if (noDataChange === undefined || noDataChange === null || noDataChange === false) {
                this._getSeriesData();
            }

            // Clear all scales, this is required to fix Issue #67
            this.axes.forEach(function (axis) {
                axis._scale = null;
            }, this);

            // Iterate the axes and calculate bounds, this is done within the chart because an
            // axis' bounds are determined by other axes and the way that series tie them together
            this.axes.forEach(function (axis) {
                axis._min = 0;
                axis._max = 0;
                linkedDimensions = [];
                // Check that the axis has a measure
                if (axis._hasMeasure()) {
                    // Is this axis linked to a series
                    var linked = false;
                    // Find any linked series
                    this.series.forEach(function (series) {
                        // if this axis is linked
                        if (series._deepMatch(axis)) {
                            // Get the bounds
                            var bounds = series._axisBounds(axis.position);
                            if (axis._min > bounds.min) { axis._min = bounds.min; }
                            if (axis._max < bounds.max) { axis._max = bounds.max; }
                            linked = true;
                        }
                    }, this);
                    // If the axis is not linked, use the data bounds, this is unlikely to be used
                    // in a real context, but when developing it is nice to see axes before any series have
                    // been added.
                    if (!linked) {
                        this._getAllData().forEach(function (d) {
                            if (axis._min > d[axis.measure]) { axis._min = d[axis.measure]; }
                            if (axis._max < d[axis.measure]) { axis._max = d[axis.measure]; }
                        }, this);
                    }
                } else if (axis._hasTimeField()) {
                    // Parse the dates and assign the min and max
                    axis._min = null;
                    axis._max = null;
                    // Create an array of dimensions for this axis
                    this.series.forEach(function (series) {
                        // if this axis is linked
                        if (series._deepMatch(axis)
                                && series[axis.position].timeField !== null
                                && series[axis.position].timeField !== undefined
                                && linkedDimensions.indexOf(series[axis.position].timeField) === -1) {
                            linkedDimensions.push(series[axis.position].timeField);
                        }
                    }, this);
                    // Iterate the data
                    axis._getAxisData().forEach(function (d) {
                        // Find any linked series
                        linkedDimensions.forEach(function (dimension) {
                            // Check it's timeField
                            var dt = axis._parseDate(d[dimension]);
                            if (axis._min === null || dt < axis._min) {
                                axis._min = dt;
                            }
                            if (axis._max === null || dt > axis._max) {
                                axis._max = dt;
                            }
                        }, this);
                    }, this);
                } else if (axis._hasCategories()) {
                    // A category axis is just set to show the number of categories
                    axis._min = 0;
                    distinctCats = [];
                    // Create an array of dimensions for this axis
                    this.series.forEach(function (series) {
                        // if this axis is linked
                        if (series._deepMatch(axis)
                                && series[axis.position].categoryFields[0] !== null
                                && series[axis.position].categoryFields[0] !== undefined
                                && linkedDimensions.indexOf(series[axis.position].categoryFields[0]) === -1) {
                            linkedDimensions.push(series[axis.position].categoryFields[0]);
                        }
                    }, this);
                    axis._getAxisData().forEach(function (d) {
                        linkedDimensions.forEach(function (dimension) {
                            if (distinctCats.indexOf(d[dimension]) === -1) {
                                distinctCats.push(d[dimension]);
                            }
                        }, this);
                    }, this);
                    axis._max = distinctCats.length;
                }
                // Set the bounds on all slaves
                if (axis._slaves !== null && axis._slaves !== undefined && axis._slaves.length > 0) {
                    axis._slaves.forEach(function (slave) {
                        slave._min = axis._min;
                        slave._max = axis._max;
                    }, this);
                }
                // Update the axis now we have all information set
                axis._update();

                // Record the index of the first x and first y axes
                if (firstX === null && axis.position === "x") {
                    firstX = axis;
                } else if (firstY === null && axis.position === "y") {
                    firstY = axis;
                }
            }, this);
            // Iterate the axes again
            this.axes.forEach(function (axis) {
                // Don't animate axes on first draw
                var firstDraw = false,
                    transform = null,
                    gridSize = 0,
                    gridTransform = null,
                    rotated = false,
                    widest = 0,
                    box = { l: null, t: null, r: null, b: null },
                    titleX = 0,
                    titleY = 0,
                    rotate = "",
                    chart = this,
                    handleTrans = function (ob) {
                        // Draw the axis
                        // This code might seem unnecessary but even applying a duration of 0 to a transition will cause the code to execute after the
                        // code below and precedence is important here.
                        var returnObj;
                        if (transform === null || duration === 0 || firstDraw) {
                            returnObj = ob;
                        } else {
                            returnObj = chart._handleTransition(ob, duration, chart);
                        }
                        return returnObj;
                    },
                    transformLabels = function () {
                        if (!axis.measure) {
                            if (axis.position === "x") {
                                d3.select(this).selectAll("text").attr("x", (chartWidth / axis._max) / 2);
                            } else if (axis.position === "y") {
                                d3.select(this).selectAll("text").attr("y", -1 * (chartHeight / axis._max) / 2);
                            }
                        }
                        if (axis.categoryFields && axis.categoryFields.length > 0) {
                            // Off set the labels to counter the transform.  This will put the labels along the outside of the chart so they
                            // don't interfere with the chart contents
                            if (axis === firstX && (firstY.categoryFields === null || firstY.categoryFields.length === 0)) {
                                d3.select(this).selectAll("text").attr("y", chartY + chartHeight - firstY._scale(0) + 9);
                            }
                            if (axis === firstY && (firstX.categoryFields === null || firstX.categoryFields.length === 0)) {
                                d3.select(this).selectAll("text").attr("x", -1 * (firstX._scale(0) - chartX) - 9);
                            }
                        }
                    };

                if (axis.gridlineShapes === null) {
                    if (axis.showGridlines || (axis.showGridlines === null && !axis._hasCategories() && ((!xGridSet && axis.position === "x") || (!yGridSet && axis.position === "y")))) {
                        // Add a group for the gridlines to allow css formatting
                        axis.gridlineShapes = this._group.append("g").attr("class", "dimple-gridline");
                        if (axis.position === "x") {
                            xGridSet = true;
                        } else {
                            yGridSet = true;
                        }
                    }
                } else {
                    if (axis.position === "x") {
                        xGridSet = true;
                    } else {
                        yGridSet = true;
                    }
                }
                if (axis.shapes === null) {
                    // Add a group for the axes to allow css formatting
                    axis.shapes = this._group.append("g")
                        .attr("class", "dimple-axis")
                        .each(function () {
                            if (!chart.noFormats) {
                                d3.select(this)
                                    .style("font-family", axis.fontFamily)
                                    .style("font-size", axis._getFontSize());
                            }
                        });
                    firstDraw = true;
                }
                // If this is the first x and there is a y axis cross them at zero
                if (axis === firstX && firstY !== null) {
                    transform = "translate(0, " + (firstY.categoryFields === null || firstY.categoryFields.length === 0 ? firstY._scale(0) : chartY + chartHeight) + ")";
                    gridTransform = "translate(0, " + (axis === firstX ? chartY + chartHeight : chartY) + ")";
                    gridSize = -chartHeight;
                } else if (axis === firstY && firstX !== null) {
                    transform = "translate(" + (firstX.categoryFields === null || firstX.categoryFields.length === 0 ? firstX._scale(0) : chartX) + ", 0)";
                    gridTransform = "translate(" + (axis === firstY ? chartX : chartX + chartWidth) + ", 0)";
                    gridSize = -chartWidth;
                } else if (axis.position === "x") {
                    gridTransform = transform = "translate(0, " + (axis === firstX ? chartY + chartHeight : chartY) + ")";
                    gridSize = -chartHeight;
                } else if (axis.position === "y") {
                    gridTransform = transform = "translate(" + (axis === firstY ? chartX : chartX + chartWidth) + ", 0)";
                    gridSize = -chartWidth;
                }
                if (transform !== null && axis._draw !== null) {

                    // Add a tick format
                    if (axis._hasTimeField()) {
                        handleTrans(axis.shapes)
                            .call(axis._draw.ticks(axis._getTimePeriod(), axis.timeInterval).tickFormat(axis._getFormat()))
                            .attr("transform", transform)
                            .each(transformLabels);
                    } else if (axis.useLog) {
                        handleTrans(axis.shapes)
                            .call(axis._draw.ticks(4, axis._getFormat()))
                            .attr("transform", transform)
                            .each(transformLabels);
                    } else {
                        handleTrans(axis.shapes)
                            .call(axis._draw.tickFormat(axis._getFormat()))
                            .attr("transform", transform)
                            .each(transformLabels);
                    }
                    if (axis.gridlineShapes !== null) {
                        handleTrans(axis.gridlineShapes)
                            .call(axis._draw.tickSize(gridSize, 0, 0).tickFormat(""))
                            .attr("transform", gridTransform);
                    }
                }
                // Set some initial css values
                if (!this.noFormats) {
                    handleTrans(axis.shapes.selectAll("text"))
                        .style("font-family", axis.fontFamily)
                        .style("font-size", axis._getFontSize());
                    handleTrans(axis.shapes.selectAll("path, line"))
                        .style("fill", "none")
                        .style("stroke", "black")
                        .style("shape-rendering", "crispEdges");
                    if (axis.gridlineShapes !== null) {
                        handleTrans(axis.gridlineShapes.selectAll("line"))
                            .style("fill", "none")
                            .style("stroke", "lightgray")
                            .style("opacity", 0.8);
                    }
                }
                // Rotate labels, this can only be done once the formats are set
                if (axis.measure === null || axis.measure === undefined) {
                    if (axis === firstX) {
                        // If the gaps are narrower than the widest label display all labels horizontally
                        widest = 0;
                        axis.shapes.selectAll("text").each(function () {
                            var w = this.getComputedTextLength();
                            widest = (w > widest ? w : widest);
                        });
                        if (widest > chartWidth / axis.shapes.selectAll("text")[0].length) {
                            rotated = true;
                            axis.shapes.selectAll("text")
                                .style("text-anchor", "start")
                                .each(function () {
                                    var rec = this.getBBox();
                                    d3.select(this)
                                        .attr("transform", "rotate(90," + rec.x + "," + (rec.y + (rec.height / 2)) + ") translate(-5, 0)");
                                });
                        } else {
                            // For redraw operations we need to clear the transform
                            rotated = false;
                            axis.shapes.selectAll("text")
                                .style("text-anchor", "middle")
                                .attr("transform", "");
                        }
                    } else if (axis.position === "x") {
                        // If the gaps are narrower than the widest label display all labels horizontally
                        widest = 0;
                        axis.shapes.selectAll("text")
                            .each(function () {
                                var w = this.getComputedTextLength();
                                widest = (w > widest ? w : widest);
                            });
                        if (widest > chartWidth / axis.shapes.selectAll("text")[0].length) {
                            rotated = true;
                            axis.shapes.selectAll("text")
                                .style("text-anchor", "end")
                                .each(function () {
                                    var rec = this.getBBox();
                                    d3.select(this)
                                        .attr("transform", "rotate(90," + (rec.x + rec.width) + "," + (rec.y + (rec.height / 2)) + ") translate(5, 0)");
                                });
                        } else {
                            // For redraw operations we need to clear the transform
                            rotated = false;
                            axis.shapes.selectAll("text")
                                .style("text-anchor", "middle")
                                .attr("transform", "");
                        }
                    }
                }
                if (axis.titleShape !== null && axis.titleShape !== undefined) {
                    axis.titleShape.remove();
                }
                // Get the bounds of the axis objects
                axis.shapes.selectAll("text")
                    .each(function () {
                        var rec = this.getBBox();
                        if (box.l === null ||  -9 - rec.width < box.l) {
                            box.l = -9 - rec.width;
                        }
                        if (box.r === null || rec.x + rec.width > box.r) {
                            box.r = rec.x + rec.width;
                        }
                        if (rotated) {
                            if (box.t === null || rec.y + rec.height - rec.width < box.t) {
                                box.t = rec.y + rec.height - rec.width;
                            }
                            if (box.b === null || rec.height + rec.width > box.b) {
                                box.b = rec.height + rec.width;
                            }
                        } else {
                            if (box.t === null || rec.y < box.t) {
                                box.t = rec.y;
                            }
                            if (box.b === null || 9 + rec.height > box.b) {
                                box.b = 9 + rec.height;
                            }
                        }
                    });

                if (axis.position === "x") {
                    if (axis === firstX) {
                        titleY = chartY + chartHeight + box.b + 5;
                    } else {
                        titleY = chartY + box.t - 10;
                    }
                    titleX = chartX + (chartWidth / 2);
                } else if (axis.position === "y") {
                    if (axis === firstY) {
                        titleX = chartX + box.l - 10;
                    } else {
                        titleX = chartX + chartWidth + box.r + 20;
                    }
                    titleY = chartY + (chartHeight / 2);
                    rotate = "rotate(270, " + titleX + ", " + titleY + ")";
                }

                // Add a title for the axis - NB check for null here, by default the title is undefined, in which case
                // use the dimension name
                if (!axis.hidden && (axis.position === "x" || axis.position === "y") && axis.title !== null) {
                    axis.titleShape = this._group.append("text").attr("class", "dimple-axis dimple-title");
                    axis.titleShape
                        .attr("x", titleX)
                        .attr("y", titleY)
                        .attr("text-anchor", "middle")
                        .attr("transform", rotate)
                        .text(axis.title !== undefined ? axis.title : (axis.categoryFields === null || axis.categoryFields === undefined || axis.categoryFields.length === 0 ? axis.measure : axis.categoryFields.join("/")))
                        .each(function () {
                            if (!chart.noFormats) {
                                d3.select(this)
                                    .style("font-family", axis.fontFamily)
                                    .style("font-size", axis._getFontSize());
                            }
                        });

                    // Offset Y position to baseline. This previously used dominant-baseline but this caused
                    // browser inconsistency
                    if (axis === firstX) {
                        axis.titleShape.each(function () {
                            d3.select(this).attr("y", titleY + this.getBBox().height / 1.65);
                        });
                    } else if (axis === firstY) {
                        axis.titleShape.each(function () {
                            d3.select(this).attr("x", titleX + this.getBBox().height / 1.65);
                        });
                    }
                }
               // }
            }, this);

            // Iterate the series
            this.series.forEach(function (series) {
                series.plot.draw(this, series, duration);
                this._registerEventHandlers(series);
            }, this);

            // Iterate the legends
            this.legends.forEach(function (legend) {
                legend._draw();
            }, this);

            // If the chart has a storyboard
            if (this.storyboard) {
                this.storyboard._drawText();
                if (this.storyboard.autoplay) {
                    this.storyboard.startAnimation();
                }
            }

            // Return the chart for chaining
            return this;

        };
