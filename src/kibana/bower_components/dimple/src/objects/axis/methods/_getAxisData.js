        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/_getAxisData.js
        // Get all the datasets which may affect this axis
        this._getAxisData = function () {
            var i,
                series,
                returnData = [],
                addChartData = false;
            if (this.chart && this.chart.series) {
                for (i = 0; i < this.chart.series.length; i += 1) {
                    series = this.chart.series[i];
                    // If the series is related to this axis
                    if (series[this.position] === this) {
                        // If the series has its own data set add it to the return array
                        if (series.data && series.data.length > 0) {
                            returnData = returnData.concat(series.data);
                        } else {
                            addChartData = true;
                        }
                    }
                }
                if (addChartData && this.chart.data) {
                    returnData = returnData.concat(this.chart.data);
                }
            }
            return returnData;
        };
