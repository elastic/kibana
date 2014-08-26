    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_getSeriesSortPredicate.js
    dimple._getSeriesSortPredicate = function (chart, series, orderedArray) {
        return function (a, b) {
            var sortValue = 0;
            // Modified to keep trying until a difference is found.  Previously these were else if statements
            // Issue #71
            if (series.x._hasCategories()) {
                sortValue = (dimple._helpers.cx(a, chart, series) - dimple._helpers.cx(b, chart, series));
            }
            if (sortValue === 0 && series.y._hasCategories()) {
                sortValue = (dimple._helpers.cy(a, chart, series) - dimple._helpers.cy(b, chart, series));
            }
            if (sortValue === 0 && orderedArray) {
                sortValue = dimple._arrayIndexCompare(orderedArray, a.aggField, b.aggField);
            }
            return sortValue;
        };
    };
