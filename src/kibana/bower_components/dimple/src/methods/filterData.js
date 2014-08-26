    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/filterData.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple#wiki-filterData
    dimple.filterData = function (data, field, filterValues) {
        var returnData = data;
        if (field !== null && filterValues !== null) {
            // Build an array from a single filter value or use the array
            if (filterValues !== null && filterValues !== undefined) { filterValues = [].concat(filterValues); }
            // The data to return
            returnData = [];
            // Iterate all the data
            data.forEach(function (d) {
                // If an invalid field is passed, just pass the data
                if (d[field] === null) {
                    returnData.push(d);
                } else {
                    if (filterValues.indexOf([].concat(d[field]).join("/")) > -1) {
                        returnData.push(d);
                    }
                }
            }, this);
        }
        // Return the filtered data
        return returnData;
    };

