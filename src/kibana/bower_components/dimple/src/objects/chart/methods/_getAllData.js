        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_getAllData.js
        // Mash together all of the datasets
        this._getAllData = function () {
            // The return array will include all data for chart as well as any series
            var returnData = [];
            // If there is data at the chart level
            if (this.data !== null && this.data !== undefined && this.data.length > 0) {
                returnData = returnData.concat(this.data);
            }
            // If there are series defined
            if (this.series !== null && this.series !== undefined && this.series.length > 0) {
                this.series.forEach(function (s) {
                    if (s.data !== null && s.data !== undefined && s.data.length > 0) {
                        returnData = returnData.concat(s.data);
                    }
                });
            }
            // Return the final dataset
            return returnData;
        };

