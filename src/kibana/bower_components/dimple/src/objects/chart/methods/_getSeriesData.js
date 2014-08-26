        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_getSeriesData.js
        // Create a dataset containing positioning information for every series
        this._getSeriesData = function () {

            // If there are series
            if (this.series !== null && this.series !== undefined) {

                // Iterate all the series
                this.series.forEach(function (series) {

                    // The data for this series
                    var data = series.data || this.data || [],
                        cats = [].concat(series.categoryFields || "All"),
                        returnData = this._getData(data, cats, series.aggregate, series._orderRules, series._isStacked(), series.x, series.y, series.z, series.p, series.c),
                        higherLevelData = [],
                        i,
                        j,
                        aCats,
                        aCatString,
                        bCats,
                        bCatString,
                        pieDictionary = {},
                        startAngle = (series.startAngle * (Math.PI / 180) || 0),
                        endAngle = (series.endAngle || 360) * (Math.PI / 180);

                    // If the startAngle is after the endAngle (e.g. 270deg -> 90deg becomes -90deg -> 90deg.
                    if (startAngle > endAngle) {
                        startAngle -= 2 * Math.PI;
                    }

                    // If there is a pie axis we need to run a second dataset because the x and y will be
                    // at a higher level of aggregation than the rows, we want all the segments for a pie chart to
                    // have the same x and y values
                    if (series.p && cats.length > 0) {
                        if (series.x && series.y) {
                            cats.pop();
                            higherLevelData = this._getData(data, ["__dimple_placeholder__"].concat(cats), series.aggregate, series._orderRules, series._isStacked(), series.x, series.y, series.z, series.p, series.c);
                            for (i = 0; i < returnData.length; i += 1) {
                                aCats = ["__dimple_placeholder__"].concat(returnData[i].aggField);
                                aCats.pop();
                                if (series.x && series.x._hasCategories()) {
                                    aCats = aCats.concat(returnData[i].xField);
                                }
                                if (series.y && series.y._hasCategories()) {
                                    aCats = aCats.concat(returnData[i].yField);
                                }
                                aCatString = aCats.join("|");
                                for (j = 0; j < higherLevelData.length; j += 1) {
                                    bCats = [].concat(higherLevelData[j].aggField);
                                    if (series.x && series.x._hasCategories()) {
                                        bCats = bCats.concat(higherLevelData[j].xField);
                                    }
                                    if (series.y && series.y._hasCategories()) {
                                        bCats = bCats.concat(higherLevelData[j].yField);
                                    }
                                    bCatString = bCats.join("|");
                                    if (aCatString === bCatString) {
                                        returnData[i].xField = higherLevelData[j].xField;
                                        returnData[i].xValue = higherLevelData[j].xValue;
                                        returnData[i].xCount = higherLevelData[j].xCount;
                                        returnData[i].yField = higherLevelData[j].yField;
                                        returnData[i].yValue = higherLevelData[j].yValue;
                                        returnData[i].yCount = higherLevelData[j].yCount;
                                        returnData[i].zField = higherLevelData[j].zField;
                                        returnData[i].zValue = higherLevelData[j].zValue;
                                        returnData[i].zCount = higherLevelData[j].zCount;
                                        returnData[i].x = higherLevelData[j].x;
                                        returnData[i].y = higherLevelData[j].y;
                                        returnData[i].r = higherLevelData[j].r;
                                        returnData[i].xOffset = higherLevelData[j].xOffset;
                                        returnData[i].yOffset = higherLevelData[j].yOffset;
                                        returnData[i].width = higherLevelData[j].width;
                                        returnData[i].height = higherLevelData[j].height;
                                        returnData[i].cx = higherLevelData[j].cx;
                                        returnData[i].cy = higherLevelData[j].cy;
                                        returnData[i].xBound = higherLevelData[j].xBound;
                                        returnData[i].yBound = higherLevelData[j].yBound;
                                        returnData[i].xValueList = higherLevelData[j].xValueList;
                                        returnData[i].yValueList = higherLevelData[j].yValueList;
                                        returnData[i].zValueList = higherLevelData[j].zValueList;
                                        returnData[i].cValueList = higherLevelData[j].cValueList;

                                        // Add some specific pie properties
                                        returnData[i].pieKey = higherLevelData[j].key;
                                        returnData[i].value = returnData.pValue;

                                        // Annoyingly we can't use the higher aggregate value here because if the series is averaged
                                        // rather than summed it breaks the logic
                                        if (!pieDictionary[higherLevelData[j].key]) {
                                            pieDictionary[higherLevelData[j].key] = {
                                                total: 0,
                                                angle: startAngle
                                            };
                                        }
                                        pieDictionary[higherLevelData[j].key].total += returnData[i].pValue;

                                        break;
                                    }
                                }
                            }
                        } else {
                            for (i = 0; i < returnData.length; i += 1) {
                                // Add some specific pie properties
                                returnData[i].pieKey = "All";
                                returnData[i].value = returnData.pValue;

                                // Annoyingly we can't use the higher aggregate value here because if the series is averaged
                                // rather than summed it breaks the logic
                                if (!pieDictionary[returnData[i].pieKey]) {
                                    pieDictionary[returnData[i].pieKey] = {
                                        total: 0,
                                        angle: startAngle
                                    };
                                }
                                pieDictionary[returnData[i].pieKey].total += returnData[i].pValue;
                            }
                        }

                        // Loop again to calculate shares
                        for (i = 0; i < returnData.length; i += 1) {
                            returnData[i].piePct = (returnData[i].pValue / pieDictionary[returnData[i].pieKey].total);
                            returnData[i].startAngle = pieDictionary[returnData[i].pieKey].angle;
                            returnData[i].endAngle = returnData[i].startAngle + returnData[i].piePct * (endAngle - startAngle);
                            pieDictionary[returnData[i].pieKey].angle = returnData[i].endAngle;
                        }
                    }

                    // populate the data in the series
                    series._positionData = returnData;

                }, this);
            }
        };

