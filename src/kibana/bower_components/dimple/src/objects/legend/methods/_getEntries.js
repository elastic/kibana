        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/legend/methods/_getEntries.js
        // Get an array of elements to be displayed in the legend
        this._getEntries = function () {
            // Create an array of distinct series values
            var entries = [];
            // If there are some series
            if (this.series) {
                // Iterate all the associated series
                this.series.forEach(function (series) {
                    // Get the series data
                    var data = series._positionData;
                    // Iterate the aggregated data
                    data.forEach(function (row) {
                        // Check whether this element is new
                        var index = -1,
                            j,
                            // Handle grouped plots (e.g. line and area where multiple points are coloured the same way
                            field = ((series.plot.grouped && !series.x._hasCategories() && !series.y._hasCategories() && row.aggField.length < 2 ? "All" : row.aggField.slice(-1)[0]));
                        for (j = 0; j < entries.length; j += 1) {
                            if (entries[j].key === field) {
                                index = j;
                                break;
                            }
                        }
                        if (index === -1 && series.chart._assignedColors[field]) {
                            // If it's a new element create a new row in the return array
                            entries.push({
                                key: field,
                                fill: series.chart._assignedColors[field].fill,
                                stroke: series.chart._assignedColors[field].stroke,
                                opacity: series.chart._assignedColors[field].opacity,
                                series: series,
                                aggField: row.aggField
                            });
                            index = entries.length - 1;
                        }
                    });
                }, this);
            }
            return entries;
        };
