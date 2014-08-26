        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_getDelay.js
        this._getDelay = function (duration, chart, series) {
            return function (d) {
                var returnValue = 0;
                if (series && chart.staggerDraw) {
                    if (series.x._hasCategories()) {
                        returnValue = (dimple._helpers.cx(d, chart, series) / chart._widthPixels()) * duration;
                    } else if (series.y._hasCategories()) {
                        returnValue = (1 - dimple._helpers.cy(d, chart, series) / chart._heightPixels()) * duration;
                    }
                }
                return returnValue;
            };
        };

