    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/plot/line.js
    dimple.plot.line = {

        // By default the values are not stacked
        stacked: false,

        // This is a grouped plot meaning many points are treated as one series value
        grouped: true,

        // The axis positions affecting the line series
        supportedAxes: ["x", "y", "c"],

        // Draw the axis
        draw: function (chart, series, duration) {
            // Get the position data
            var data = series._positionData,
                lineData = [],
                theseShapes = null,
                className = "dimple-series-" + chart.series.indexOf(series),
                firstAgg = (series.x._hasCategories() || series.y._hasCategories() ? 0 : 1),
                interpolation,
                graded = false,
                i,
                j,
                k,
                key,
                keyString,
                rowIndex,
                updated,
                removed,
                orderedSeriesArray,
                onEnter = function () {
                    return function (e, shape, chart, series) {
                        d3.select(shape).style("opacity", 1);
                        dimple._showPointTooltip(e, shape, chart, series);
                    };
                },
                onLeave = function (lineData) {
                    return function (e, shape, chart, series) {
                        d3.select(shape).style("opacity", (series.lineMarkers || lineData.data.length < 2 ? dimple._helpers.opacity(e, chart, series) : 0));
                        dimple._removeTooltip(e, shape, chart, series);
                    };
                },
                drawMarkers = function (d) {
                    dimple._drawMarkers(d, chart, series, duration, className, graded, onEnter(d), onLeave(d));
                },
                coord = function (position, datum) {
                    var val;
                    if (series.interpolation === "step" && series[position]._hasCategories()) {
                        series.barGap = 0;
                        series.clusterBarGap = 0;
                        val = dimple._helpers[position](datum, chart, series) + (position === "y" ? dimple._helpers.height(datum, chart, series) : 0);
                    } else {
                        val = dimple._helpers["c" + position](datum, chart, series);
                    }
                    // Remove long decimals from the coordinates as this fills the dom up with noise and makes matching below less likely to work.  It
                    // shouldn't really matter but positioning to < 0.1 pixel is pretty pointless anyway.
                    return parseFloat(val.toFixed(1));
                },
                getLine = function (inter, originProperty) {
                    return d3.svg.line()
                        .x(function (d) { return (series.x._hasCategories() || !originProperty ? d.x : series.x[originProperty]); })
                        .y(function (d) { return (series.y._hasCategories() || !originProperty ? d.y : series.y[originProperty]); })
                        .interpolate(inter);
                };

            // Handle the special interpolation handling for step
            interpolation =  (series.interpolation === "step" ? "step-after" : series.interpolation);

            // Get the array of ordered values
            orderedSeriesArray = dimple._getSeriesOrder(series.data || chart.data, series);

            if (series.c && ((series.x._hasCategories() && series.y._hasMeasure()) || (series.y._hasCategories() && series.x._hasMeasure()))) {
                graded = true;
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < data.length; i += 1) {
                key = [];
                rowIndex = -1;
                // Skip the first category unless there is a category axis on x or y
                for (k = firstAgg; k < data[i].aggField.length; k += 1) {
                    key.push(data[i].aggField[k]);
                }
                // Find the corresponding row in the lineData
                keyString = dimple._createClass(key);
                for (k = 0; k < lineData.length; k += 1) {
                    if (lineData[k].keyString === keyString) {
                        rowIndex = k;
                        break;
                    }
                }
                // Add a row to the line data if none was found
                if (rowIndex === -1) {
                    rowIndex = lineData.length;
                    lineData.push({
                        key: key,
                        keyString: keyString,
                        color: "white",
                        data: [],
                        markerData: [],
                        points: [],
                        line: {},
                        entry: {},
                        exit: {}
                    });
                }
                // Add this row to the relevant data
                lineData[rowIndex].data.push(data[i]);
            }

            // Sort the line data itself based on the order series array - this matters for stacked lines and default color
            // consistency with colors usually awarded in terms of prominence
            if (orderedSeriesArray) {
                lineData.sort(function (a, b) {
                    return dimple._arrayIndexCompare(orderedSeriesArray, a.key, b.key);
                });
            }

            // Create a set of line data grouped by the aggregation field
            for (i = 0; i < lineData.length; i += 1) {
                // Sort the points so that lines are connected in the correct order
                lineData[i].data.sort(dimple._getSeriesSortPredicate(chart, series, orderedSeriesArray));
                // If this should have colour gradients, add them
                if (graded) {
                    dimple._addGradient(lineData[i].key, "fill-line-gradient-" + lineData[i].keyString, (series.x._hasCategories() ? series.x : series.y), data, chart, duration, "fill");
                }

                // Get points here, this is so that as well as drawing the line with them, we can also
                // use them for the baseline
                for (j = 0; j < lineData[i].data.length; j += 1) {
                    lineData[i].points.push({
                        x: coord("x", lineData[i].data[j]),
                        y: coord("y", lineData[i].data[j])
                    });
                }
                // If this is a step interpolation we need to add in some extra points to the category axis
                // This is a little tricky but we need to add a new point duplicating the last category value.  In order
                // to place the point we need to calculate the gap between the last x and the penultimate x and apply that
                // gap again.
                if (series.interpolation === "step" && lineData[i].points.length > 1) {
                    if (series.x._hasCategories()) {
                        lineData[i].points.push({
                            x : 2 * lineData[i].points[lineData[i].points.length - 1].x - lineData[i].points[lineData[i].points.length - 2].x,
                            y : lineData[i].points[lineData[i].points.length - 1].y
                        });
                    } else if (series.y._hasCategories()) {
                        lineData[i].points = [{
                            x : lineData[i].points[0].x,
                            y : 2 * lineData[i].points[0].y - lineData[i].points[1].y
                        }].concat(lineData[i].points);
                    }
                }

                // Get the points that this line will appear
                lineData[i].entry = getLine(interpolation, "_previousOrigin")(lineData[i].points);
                lineData[i].update = getLine(interpolation)(lineData[i].points);
                lineData[i].exit = getLine(interpolation, "_origin")(lineData[i].points);

                // Add the color in this loop, it can't be done during initialisation of the row because
                // the lines should be ordered first (to ensure standard distribution of colors
                lineData[i].color = chart.getColor(lineData[i].key.length > 0 ? lineData[i].key[lineData[i].key.length - 1] : "All");
            }

            if (chart._tooltipGroup !== null && chart._tooltipGroup !== undefined) {
                chart._tooltipGroup.remove();
            }

            if (series.shapes === null || series.shapes === undefined) {
                theseShapes = chart._group.selectAll("." + className).data(lineData);
            } else {
                theseShapes = series.shapes.data(lineData, function (d) { return d.key; });
            }

            // Add
            theseShapes
                .enter()
                .append("path")
                .attr("id", function (d) { return d.key; })
                .attr("class", function (d) {
                    return className + " dimple-line " + d.keyString;
                })
                .attr("d", function (d) {
                    return d.entry;
                })
                .call(function () {
                    // Apply formats optionally
                    if (!chart.noFormats) {
                        this.attr("opacity", function (d) { return (graded ? 1 : d.color.opacity); })
                            .attr("fill", "none")
                            .attr("stroke", function (d) { return (graded ? "url(#fill-line-gradient-" + d.keyString + ")" : d.color.stroke); })
                            .attr("stroke-width", series.lineWeight);
                    }
                })
                .each(function (d) {
                    // Pass line data to markers
                    d.markerData = d.data;
                    drawMarkers(d);
                });

            // Update
            updated = chart._handleTransition(theseShapes, duration, chart)
                .attr("d", function (d) { return d.update; })
                .each(function (d) {
                    // Pass line data to markers
                    d.markerData = d.data;
                    drawMarkers(d);
                });

            // Remove
            removed = chart._handleTransition(theseShapes.exit(), duration, chart)
                .attr("d", function (d) { return d.exit; })
                .each(function (d) {
                    // Using all data for the markers fails because there are no exits in the markers
                    // only the whole line, therefore we need to clear the points here
                    d.markerData = [];
                    drawMarkers(d);
                });

            dimple._postDrawHandling(series, updated, removed, duration);

            // Save the shapes to the series array
            series.shapes = theseShapes;

        }
    };

