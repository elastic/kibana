    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/chart/methods/_getOrderedList.js
    dimple._getOrderedList = function (data, mainField, levelDefinitions) {
        var rollupData,
            sortStack = [],
            finalArray = [],
            mainArray = [].concat(mainField),
            fields = [].concat(mainField),
            defs = [];

        // Force the level definitions into an array
        if (levelDefinitions !== null && levelDefinitions !== undefined) {
            defs = defs.concat(levelDefinitions);
        }
        // Add the base case
        defs = defs.concat({ ordering: mainArray, desc: false });
        // Exclude fields if this does not contain a function
        defs.forEach(function (def) {
            var field,
                values = [],
                tempFields = [];
            if (typeof def.ordering === "function") {
                for (field in data[0]) {
                    if (data[0].hasOwnProperty(field) && fields.indexOf(field) === -1) {
                        fields.push(field);
                    }
                }
            } else if (!(def.ordering instanceof Array)) {
                fields.push(def.ordering);
            } else {
                // We now receive fields as an array or values as an array which is a bit of an oversight in the API
                // We will therefore check the values of the array against the fields in the data
                for (field = 0; field < def.ordering.length; field += 1) {
                    if (data[0].hasOwnProperty(def.ordering[field])) {
                        tempFields.push(def.ordering[field]);
                    }
                    values.push(def.ordering[field]);
                }
                // If more than half of the values are fields we will assume that these are fields and not dimension values
                if (tempFields.length > values.length / 2) {
                    fields.concat(tempFields);
                } else {
                    def.values = values;
                }
            }
        }, this);
        rollupData = dimple._rollUp(data, mainArray, fields);
        // If we go below the leaf stop recursing
        if (defs.length >= 1) {
            // Build a stack of compare methods
            // Iterate each level definition
            defs.forEach(function (def) {
                // Draw ascending by default
                var desc = (def.desc === null || def.desc === undefined ? false : def.desc),
                    ordering = def.ordering,
                    orderArray = [],
                    sum = function (array) {
                        var total = 0,
                            i;
                        for (i = 0; i < array.length; i += 1) {
                            if (isNaN(array[i])) {
                                total = undefined;
                                break;
                            } else {
                                total += parseFloat(array[i]);
                            }
                        }
                        return total;
                    },
                    compare = function (a, b) {
                        var result = 0,
                            sumA = sum(a),
                            sumB = sum(b);
                        if (!isNaN(sumA) && !isNaN(sumB)) {
                            result = parseFloat(sumA) - parseFloat(sumB);
                        } else if (!isNaN(Date.parse(a[0])) && !isNaN(Date.parse(b[0]))) {
                            result = Date.parse(a[0]) - Date.parse(b[0]);
                        } else if (a[0] < b[0]) {
                            result = -1;
                        } else if (a[0] > b[0]) {
                            result = 1;
                        }
                        return result;
                    };
                // Handle the ordering based on the type set
                if (typeof ordering === "function") {
                    // Apply the sort predicate directly
                    sortStack.push(function (a, b) {
                        return (desc ? -1 : 1) * ordering(a, b);
                    });
                } else if (def.values && def.values.length > 0) {
                    // The order list may be an array of arrays
                    // combine the values with pipe delimiters.
                    // The delimiter is irrelevant as long as it is consistent
                    // with the sort predicate below
                    def.values.forEach(function (d) {
                        orderArray.push(([].concat(d)).join("|"));
                    }, this);
                    // Sort according to the axis position
                    sortStack.push(function (a, b) {
                        var aStr = "",
                            bStr = "",
                            aIx,
                            bIx,
                            i;
                        for (i = 0; i < mainArray.length; i += 1) {
                            if (i > 0) {
                                aStr += "|";
                                bStr += "|";
                            }
                            aStr += a[mainArray[i]];
                            bStr += b[mainArray[i]];
                        }
                        // If the value is not found it should go to the end (if descending it
                        // should go to the start so that it ends up at the back when reversed)
                        aIx = orderArray.indexOf(aStr);
                        bIx = orderArray.indexOf(bStr);
                        aIx = (aIx < 0 ? (desc ? -1 : orderArray.length) : aIx);
                        bIx = (bIx < 0 ? (desc ? -1 : orderArray.length) : bIx);
                        return (desc ? -1 : 1) * (aIx - bIx);
                    });
                } else {
                    ([].concat(def.ordering)).forEach(function (field) {
                        // Sort the data
                        sortStack.push(function (a, b) {
                            // The result value
                            var result = 0;
                            // Find the field
                            if (a[field] !== undefined && b[field] !== undefined) {
                                // Compare just the first mapped value
                                result = compare([].concat(a[field]), [].concat(b[field]));
                            }
                            return (desc ? -1 : 1) * result;
                        });
                    });
                }
            });
            rollupData.sort(function (a, b) {
                var compareIx = 0,
                    result = 0;
                while (compareIx < sortStack.length && result === 0) {
                    result = sortStack[compareIx](a, b);
                    compareIx += 1;
                }
                return result;
            });
            // Return a simple array if only one field is being returned.
            // for multiple fields remove extra fields but leave objects
            rollupData.forEach(function (d) {
                var i,
                    newRow = [];
                if (mainArray.length === 1) {
                    finalArray.push(d[mainArray[0]]);
                } else {
                    for (i = 0; i < mainArray.length; i += 1) {
                        newRow.push(d[mainArray[i]]);
                    }
                    finalArray.push(newRow);
                }
            }, this);
        }
        // Return the ordered list
        return finalArray;
    };

