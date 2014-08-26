        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_getData.js
        // Create a dataset containing positioning information for every series
        this._getData = function (data, cats, agg, order, stacked, x, y, z, p, c) {
            // The data for this series
            var returnData = [],
                // Handle multiple category values by iterating the fields in the row and concatenate the values
                // This is repeated for each axis using a small anon function
                getField = function (axis, row) {
                    var returnField = [];
                    if (axis !== null) {
                        if (axis._hasTimeField()) {
                            returnField.push(axis._parseDate(row[axis.timeField]));
                        } else if (axis._hasCategories()) {
                            axis.categoryFields.forEach(function (cat) {
                                returnField.push(row[cat]);
                            }, this);
                        }
                    }
                    return returnField;
                },
            // Catch a non-numeric value and re-calc as count
                useCount = { x: false, y: false, z: false, p: false, c: false },
            // If the elements are grouped a unique list of secondary category values will be required
                secondaryElements = { x: [], y: [] },
            // Get the x and y totals for percentages.  This cannot be done in the loop above as we need the data aggregated before we get an abs total.
            // otherwise it will wrongly account for negatives and positives rolled together.
                totals = { x: [], y: [], z: [], p: [] },
                colorBounds = { min: null, max: null },
                tot,
                running = { x: [], y: [], z: [], p: [] },
                addedCats = [],
                catTotals = {},
                grandTotals = { x: 0, y: 0, z: 0, p: 0 },
                key,
                storyCat = "",
                orderedStoryboardArray = [],
                seriesCat = [],
                orderedSeriesArray = [],
                xCat = "",
                xSortArray = [],
                yCat = "",
                ySortArray = [],
                pCat = "",
                pSortArray = [],
                rules = [],
                sortedData = data,
                groupRules = [];

            if (this.storyboard && this.storyboard.categoryFields.length > 0) {
                storyCat = this.storyboard.categoryFields[0];
                orderedStoryboardArray = dimple._getOrderedList(sortedData, storyCat, this.storyboard._orderRules);
            }

            // Deal with mekkos
            if (x && x._hasCategories() && x._hasMeasure()) {
                xCat = x.categoryFields[0];
                xSortArray = dimple._getOrderedList(sortedData, xCat, x._orderRules.concat([{ ordering : x.measure, desc : true }]));
            }
            if (y && y._hasCategories() && y._hasMeasure()) {
                yCat = y.categoryFields[0];
                ySortArray = dimple._getOrderedList(sortedData, yCat, y._orderRules.concat([{ ordering : y.measure, desc : true }]));
            }
            if (p && p._hasCategories() && p._hasMeasure()) {
                pCat = p.categoryFields[0];
                pSortArray = dimple._getOrderedList(sortedData, pCat, p._orderRules.concat([{ ordering : p.measure, desc : true }]));
            }

            if (sortedData.length > 0 && cats && cats.length > 0) {
                // Concat is used here to break the reference to the parent array, if we don't do this, in a storyboarded chart,
                // the series rules to grow and grow until the system grinds to a halt trying to deal with them all.
                rules = [].concat(order);
                seriesCat = [];
                cats.forEach(function (cat) {
                    if (sortedData[0][cat] !== undefined) {
                        seriesCat.push(cat);
                    }
                }, this);
                if (p && p._hasMeasure()) {
                    rules.push({ ordering : p.measure, desc : true });
                } else if (c && c._hasMeasure()) {
                    rules.push({ ordering : c.measure, desc : true });
                } else if (z && z._hasMeasure()) {
                    rules.push({ ordering : z.measure, desc : true });
                } else if (x && x._hasMeasure()) {
                    rules.push({ ordering : x.measure, desc : true });
                } else if (y && y._hasMeasure()) {
                    rules.push({ ordering : y.measure, desc : true });
                }
                orderedSeriesArray = dimple._getOrderedList(sortedData, seriesCat, rules);
            }

            sortedData.sort(function (a, b) {
                var returnValue = 0,
                    categories,
                    comp,
                    p,
                    q,
                    aMatch,
                    bMatch;
                if (storyCat !== "") {
                    returnValue = orderedStoryboardArray.indexOf(a[storyCat]) - orderedStoryboardArray.indexOf(b[storyCat]);
                }
                if (xCat !== "" && returnValue === 0) {
                    returnValue = xSortArray.indexOf(a[xCat]) - xSortArray.indexOf(b[xCat]);
                }
                if (yCat !== "" && returnValue === 0) {
                    returnValue = ySortArray.indexOf(a[yCat]) - ySortArray.indexOf(b[yCat]);
                }
                if (pCat !== "" && returnValue === 0) {
                    returnValue = pSortArray.indexOf(a[pCat]) - ySortArray.indexOf(b[pCat]);
                }
                if (seriesCat && seriesCat.length > 0 && returnValue === 0) {
                    categories = [].concat(seriesCat);
                    returnValue = 0;
                    for (p = 0; p < orderedSeriesArray.length; p += 1) {
                        comp = [].concat(orderedSeriesArray[p]);
                        aMatch = true;
                        bMatch = true;
                        for (q = 0; q < categories.length; q += 1) {
                            aMatch = aMatch && (a[categories[q]] === comp[q]);
                            bMatch = bMatch && (b[categories[q]] === comp[q]);
                        }
                        if (aMatch && bMatch) {
                            returnValue = 0;
                            break;
                        } else if (aMatch) {
                            returnValue = -1;
                            break;
                        } else if (bMatch) {
                            returnValue = 1;
                            break;
                        }
                    }
                }
                return returnValue;
            });

            // Iterate every row in the data to calculate the return values
            sortedData.forEach(function (d) {
                // Reset the index
                var foundIndex = -1,
                    xField = getField(x, d),
                    yField = getField(y, d),
                    zField = getField(z, d),
                    pField = getField(p, d),
                // Get the aggregate field using the other fields if necessary
                    aggField = [],
                    key,
                    k,
                    i,
                    newRow,
                    updateData;

                if (!cats || cats.length === 0) {
                    aggField = ["All"];
                } else {
                    // Iterate the category fields
                    for (i = 0; i < cats.length; i += 1) {
                        // Either add the value of the field or the name itself.  This allows users to add custom values, for example
                        // Setting a particular color for a set of values can be done by using a non-existent final value and then coloring
                        // by it
                        if (d[cats[i]] === undefined) {
                            aggField.push(cats[i]);
                        } else {
                            aggField.push(d[cats[i]]);
                        }
                    }
                }

                // Add a key
                key = aggField.join("/") + "_" + xField.join("/") + "_" + yField.join("/") + "_" + pField.join("/") + "_" + zField.join("/");
                // See if this field has already been added.
                for (k = 0; k < returnData.length; k += 1) {
                    if (returnData[k].key === key) {
                        foundIndex = k;
                        break;
                    }
                }
                // If the field was not added, do so here
                if (foundIndex === -1) {
                    newRow = {
                        key: key,
                        aggField: aggField,
                        xField: xField,
                        xValue: null,
                        xCount: 0,
                        yField: yField,
                        yValue: null,
                        yCount: 0,
                        pField: pField,
                        pValue: null,
                        pCount: 0,
                        zField: zField,
                        zValue: null,
                        zCount: 0,
                        cValue: 0,
                        cCount: 0,
                        x: 0,
                        y: 0,
                        xOffset: 0,
                        yOffset: 0,
                        width: 0,
                        height: 0,
                        cx: 0,
                        cy: 0,
                        xBound: 0,
                        yBound: 0,
                        xValueList: [],
                        yValueList: [],
                        zValueList: [],
                        pValueList: [],
                        cValueList: [],
                        fill: {},
                        stroke: {}
                    };
                    returnData.push(newRow);
                    foundIndex = returnData.length - 1;
                }

                // Update the return data for the passed axis
                updateData = function (axis, storyboard) {
                    var passStoryCheck = true,
                        lhs = { value: 0, count: 1 },
                        rhs = { value: 0, count: 1 },
                        selectStoryValue,
                        compare = "",
                        retRow;
                    if (storyboard !== null) {
                        selectStoryValue = storyboard.getFrameValue();
                        storyboard.categoryFields.forEach(function (cat, m) {
                            if (m > 0) {
                                compare += "/";
                            }
                            compare += d[cat];
                            passStoryCheck = (compare === selectStoryValue);
                        }, this);
                    }
                    if (axis !== null && axis !== undefined) {
                        if (passStoryCheck) {
                            retRow = returnData[foundIndex];
                            if (axis._hasMeasure() && d[axis.measure] !== null && d[axis.measure] !== undefined) {
                                // Keep a distinct list of values to calculate a distinct count in the case of a non-numeric value being found
                                if (retRow[axis.position + "ValueList"].indexOf(d[axis.measure]) === -1) {
                                    retRow[axis.position + "ValueList"].push(d[axis.measure]);
                                }
                                // The code above is outside this check for non-numeric values because we might encounter one far down the list, and
                                // want to have a record of all values so far.
                                if (isNaN(parseFloat(d[axis.measure]))) {
                                    useCount[axis.position] = true;
                                }
                                // Set the value using the aggregate function method
                                lhs.value = retRow[axis.position + "Value"];
                                lhs.count = retRow[axis.position + "Count"];
                                rhs.value = d[axis.measure];
                                retRow[axis.position + "Value"] = agg(lhs, rhs);
                                retRow[axis.position + "Count"] += 1;
                            }
                        }
                    }
                };
                // Update all the axes
                updateData(x, this.storyboard);
                updateData(y, this.storyboard);
                updateData(z, this.storyboard);
                updateData(p, this.storyboard);
                updateData(c, this.storyboard);
            }, this);
            // Get secondary elements if necessary
            if (x && x._hasCategories() && x.categoryFields.length > 1 && secondaryElements.x !== undefined) {
                groupRules = [];
                if (y._hasMeasure()) {
                    groupRules.push({ ordering : y.measure, desc : true });
                }
                secondaryElements.x = dimple._getOrderedList(sortedData, x.categoryFields[1], x._groupOrderRules.concat(groupRules));
            }
            if (y && y._hasCategories() && y.categoryFields.length > 1 && secondaryElements.y !== undefined) {
                groupRules = [];
                if (x._hasMeasure()) {
                    groupRules.push({ ordering : x.measure, desc : true });
                }
                secondaryElements.y = dimple._getOrderedList(sortedData, y.categoryFields[1], y._groupOrderRules.concat(groupRules));
                secondaryElements.y.reverse();
            }
            returnData.forEach(function (ret) {
                if (x !== null) {
                    if (useCount.x === true) { ret.xValue = ret.xValueList.length; }
                    tot = (totals.x[ret.xField.join("/")] || 0) + (y._hasMeasure() ? Math.abs(ret.yValue) : 0);
                    totals.x[ret.xField.join("/")] = tot;
                }
                if (y !== null) {
                    if (useCount.y === true) { ret.yValue = ret.yValueList.length; }
                    tot = (totals.y[ret.yField.join("/")] || 0) + (x._hasMeasure() ? Math.abs(ret.xValue) : 0);
                    totals.y[ret.yField.join("/")] = tot;
                }
                if (p !== null) {
                    if (useCount.p === true) { ret.pValue = ret.pValueList.length; }
                    tot = (totals.p[ret.pField.join("/")] || 0) + (p._hasMeasure() ? Math.abs(ret.pValue) : 0);
                    totals.p[ret.pField.join("/")] = tot;
                }
                if (z !== null) {
                    if (useCount.z === true) { ret.zValue = ret.zValueList.length; }
                    tot = (totals.z[ret.zField.join("/")] || 0) + (z._hasMeasure() ? Math.abs(ret.zValue) : 0);
                    totals.z[ret.zField.join("/")] = tot;
                }
                if (c !== null) {
                    if (colorBounds.min === null || ret.cValue < colorBounds.min) { colorBounds.min = ret.cValue; }
                    if (colorBounds.max === null || ret.cValue > colorBounds.max) { colorBounds.max = ret.cValue; }
                }
            }, this);
            // Before calculating the positions we need to sort elements

            // Set all the dimension properties of the data
            for (key in totals.x) { if (totals.x.hasOwnProperty(key)) { grandTotals.x += totals.x[key]; } }
            for (key in totals.y) { if (totals.y.hasOwnProperty(key)) { grandTotals.y += totals.y[key]; } }
            for (key in totals.p) { if (totals.p.hasOwnProperty(key)) { grandTotals.p += totals.p[key]; } }
            for (key in totals.z) { if (totals.z.hasOwnProperty(key)) { grandTotals.z += totals.z[key]; } }

            returnData.forEach(function (ret) {
                var baseColor,
                    targetColor,
                    scale,
                    colorVal,
                    floatingPortion,
                    getAxisData = function (axis, opp, size) {
                        var totalField,
                            value,
                            selectValue,
                            pos,
                            cumValue;
                        if (axis !== null && axis !== undefined) {
                            pos = axis.position;
                            if (!axis._hasCategories()) {
                                value = (axis.showPercent ? ret[pos + "Value"] / totals[opp][ret[opp + "Field"].join("/")] : ret[pos + "Value"]);
                                totalField = ret[opp + "Field"].join("/") + (ret[pos + "Value"] >= 0);
                                cumValue = running[pos][totalField] = ((running[pos][totalField] === null || running[pos][totalField] === undefined || pos === "z" || pos === "p") ? 0 : running[pos][totalField]) + value;
                                selectValue = ret[pos + "Bound"] = ret["c" + pos] = (((pos === "x" || pos === "y") && stacked) ? cumValue : value);
                                ret[size] = value;
                                ret[pos] = selectValue - (((pos === "x" && value >= 0) || (pos === "y" && value <= 0)) ? value : 0);
                            } else {
                                if (axis._hasMeasure()) {
                                    totalField = ret[axis.position + "Field"].join("/");
                                    value = (axis.showPercent ? totals[axis.position][totalField] / grandTotals[axis.position] : totals[axis.position][totalField]);
                                    if (addedCats.indexOf(totalField) === -1) {
                                        catTotals[totalField] = value + (addedCats.length > 0 ? catTotals[addedCats[addedCats.length - 1]] : 0);
                                        addedCats.push(totalField);
                                    }
                                    selectValue = ret[pos + "Bound"] = ret["c" + pos] = (((pos === "x" || pos === "y") && stacked) ? catTotals[totalField] : value);
                                    ret[size] = value;
                                    ret[pos] = selectValue - (((pos === "x" && value >= 0) || (pos === "y" && value <= 0)) ? value : 0);
                                } else {
                                    ret[pos] = ret["c" + pos] = ret[pos + "Field"][0];
                                    ret[size] = 1;
                                    if (secondaryElements[pos] !== undefined && secondaryElements[pos] !== null && secondaryElements[pos].length >= 2) {
                                        ret[pos + "Offset"] = secondaryElements[pos].indexOf(ret[pos + "Field"][1]);
                                        ret[size] = 1 / secondaryElements[pos].length;
                                    }
                                }
                            }
                        }
                    };
                getAxisData(x, "y", "width");
                getAxisData(y, "x", "height");
                getAxisData(z, "z", "r");
                getAxisData(p, "p", "angle");

                // If there is a color axis
                if (c !== null && colorBounds.min !== null && colorBounds.max !== null) {
                    // Handle matching min and max
                    if (colorBounds.min === colorBounds.max) {
                        colorBounds.min -= 0.5;
                        colorBounds.max += 0.5;
                    }
                    // Limit the bounds of the color value to be within the range.  Users may override the axis bounds and this
                    // allows a 2 color scale rather than blending if the min and max are set to 0 and 0.01 for example negative values
                    // and zero value would be 1 color and positive another.
                    colorBounds.min = (c.overrideMin || colorBounds.min);
                    colorBounds.max = (c.overrideMax || colorBounds.max);
                    ret.cValue = (ret.cValue > colorBounds.max ? colorBounds.max : (ret.cValue < colorBounds.min ? colorBounds.min : ret.cValue));
                    // Calculate the factors for the calculations
                    scale = d3.scale.linear().range([0, (c.colors === null || c.colors.length === 1 ? 1 : c.colors.length - 1)]).domain([colorBounds.min, colorBounds.max]);
                    colorVal = scale(ret.cValue);
                    floatingPortion = colorVal - Math.floor(colorVal);
                    if (ret.cValue === colorBounds.max) {
                        floatingPortion = 1;
                    }
                    // If there is a single color defined
                    if (c.colors && c.colors.length === 1) {
                        baseColor = d3.rgb(c.colors[0]);
                        targetColor = d3.rgb(this.getColor(ret.aggField.slice(-1)[0]).fill);
                    } else if (c.colors && c.colors.length > 1) {
                        baseColor = d3.rgb(c.colors[Math.floor(colorVal)]);
                        targetColor = d3.rgb(c.colors[Math.ceil(colorVal)]);
                    } else {
                        baseColor = d3.rgb("white");
                        targetColor = d3.rgb(this.getColor(ret.aggField.slice(-1)[0]).fill);
                    }
                    // Calculate the correct grade of color
                    baseColor.r = Math.floor(baseColor.r + (targetColor.r - baseColor.r) * floatingPortion);
                    baseColor.g = Math.floor(baseColor.g + (targetColor.g - baseColor.g) * floatingPortion);
                    baseColor.b = Math.floor(baseColor.b + (targetColor.b - baseColor.b) * floatingPortion);
                    // Set the colors on the row
                    ret.fill = baseColor.toString();
                    ret.stroke = baseColor.darker(0.5).toString();
                }

            }, this);

            return returnData;

        };

