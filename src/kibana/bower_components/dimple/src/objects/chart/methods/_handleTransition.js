          // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/chart/methods/_handleTransition.js
        this._handleTransition = function (input, duration, chart, series) {
            var returnShape = null;
            if (duration === 0) {
                returnShape = input;
            } else {
                returnShape = input.transition()
                    .duration(duration)
                    .delay(chart._getDelay(duration, chart, series))
                    .ease(chart.ease);
            }
            return returnShape;
        };
