        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addSeries.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addSeries
        this.addSeries = function (categoryFields, plotFunction, axes) {
            // Deal with no axes passed
            if (axes === null || axes === undefined) { axes = this.axes; }
            // Deal with no plot function
            if (plotFunction === null || plotFunction === undefined) { plotFunction = dimple.plot.bubble; }
            // Axis objects to be picked from the array
            var xAxis = null,
                yAxis = null,
                zAxis = null,
                colorAxis = null,
                pieAxis = null,
                series;
            // Iterate the array and pull out the relevant axes
            axes.forEach(function (axis) {
                if (axis !== null && plotFunction.supportedAxes.indexOf(axis.position) > -1) {
                    if (xAxis === null && axis.position[0] === "x") {
                        xAxis = axis;
                    } else if (yAxis === null && axis.position[0] === "y") {
                        yAxis = axis;
                    } else if (zAxis === null && axis.position[0] === "z") {
                        zAxis = axis;
                    } else if (colorAxis === null && axis.position[0] === "c") {
                        colorAxis = axis;
                    } else if (colorAxis === null && axis.position[0] === "p") {
                        pieAxis = axis;
                    }
                }
            }, this);
            // Put single values into single value arrays
            if (categoryFields) {
                categoryFields = [].concat(categoryFields);
            }
            // Create a series object
            series = new dimple.series(
                this,
                categoryFields,
                xAxis,
                yAxis,
                zAxis,
                colorAxis,
                pieAxis,
                plotFunction,
                dimple.aggregateMethod.sum,
                plotFunction.stacked
            );
            // Add the series to the chart's array
            this.series.push(series);
            // Return the series
            return series;
        };

