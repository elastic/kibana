        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/_axisBounds.js
        this._axisBounds = function (position) {
            var bounds = { min: 0, max: 0 },
                // The primary axis for this comparison
                primaryAxis = null,
                // The secondary axis for this comparison
                secondaryAxis = null,
                // The running totals of the categories
                categoryTotals = [],
                // The maximum index of category totals
                catCount = 0,
                measureName,
                fieldName,
                distinctCats,
                aggData = this._positionData;

            // If the primary axis is x the secondary is y and vice versa, a z axis has no secondary
            if (position === "x") {
                primaryAxis = this.x;
                secondaryAxis = this.y;
            } else if (position === "y") {
                primaryAxis = this.y;
                secondaryAxis = this.x;
            } else if (position === "z") {
                primaryAxis = this.z;
            } else if (position === "p") {
                primaryAxis = this.p;
            } else if (position === "c") {
                primaryAxis = this.c;
            }

            // If the corresponding axis is category axis
            if (primaryAxis.showPercent) {
                // Iterate the data
                aggData.forEach(function (d) {
                    if (d[primaryAxis.position + "Bound"] < bounds.min) {
                        bounds.min = d[primaryAxis.position + "Bound"];
                    }
                    if (d[primaryAxis.position + "Bound"] > bounds.max) {
                        bounds.max = d[primaryAxis.position + "Bound"];
                    }
                }, this);
            } else if (secondaryAxis === null || secondaryAxis.categoryFields === null || secondaryAxis.categoryFields.length === 0) {
                aggData.forEach(function (d) {
                    // If the primary axis is stacked
                    if (this._isStacked() && (primaryAxis.position === "x" || primaryAxis.position === "y")) {
                        // We just need to push the bounds.  A stacked axis will always include 0 so I just need to push the min and max out from there
                        if (d[primaryAxis.position + "Value"] < 0) {
                            bounds.min = bounds.min + d[primaryAxis.position + "Value"];
                        } else {
                            bounds.max = bounds.max + d[primaryAxis.position + "Value"];
                        }
                    } else {
                        // If it isn't stacked we need to catch the minimum and maximum values
                        if (d[primaryAxis.position + "Value"] < bounds.min) {
                            bounds.min = d[primaryAxis.position + "Value"];
                        }
                        if (d[primaryAxis.position + "Value"] > bounds.max) {
                            bounds.max = d[primaryAxis.position + "Value"];
                        }
                    }
                }, this);
            } else {
                // If this category value (or combination if multiple fields defined) is not already in the array of categories, add it.
                measureName = primaryAxis.position + "Value";
                fieldName = secondaryAxis.position + "Field";
                // Get a list of distinct categories on the secondary axis
                distinctCats = [];
                aggData.forEach(function (d) {
                    // Create a field for this row in the aggregated data
                    var field = d[fieldName].join("/"),
                        index = distinctCats.indexOf(field);
                    if (index === -1) {
                        distinctCats.push(field);
                        index = distinctCats.length - 1;
                    }
                    // Get the index of the field
                    if (categoryTotals[index] === undefined) {
                        categoryTotals[index] = { min: 0, max: 0 };
                        if (index >= catCount) {
                            catCount = index + 1;
                        }
                    }
                    // The secondary axis is a category axis, we need to account
                    // for distribution across categories
                    if (this.stacked) {
                        if (d[measureName] < 0) {
                            categoryTotals[index].min = categoryTotals[index].min + d[measureName];
                        } else {
                            categoryTotals[index].max = categoryTotals[index].max + d[measureName];
                        }
                    } else {
                        // If it isn't stacked we need to catch the minimum and maximum values
                        if (d[measureName] < categoryTotals[index].min) {
                            categoryTotals[index].min = d[measureName];
                        }
                        if (d[measureName] > categoryTotals[index].max) {
                            categoryTotals[index].max = d[measureName];
                        }
                    }
                }, this);
                categoryTotals.forEach(function (catTot) {
                    if (catTot !== undefined) {
                        if (catTot.min < bounds.min) {
                            bounds.min = catTot.min;
                        }
                        if (catTot.max > bounds.max) {
                            bounds.max = catTot.max;
                        }
                    }
                }, this);
            }
            return bounds;
        };

