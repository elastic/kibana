    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_drawMarkers.js
    dimple._postDrawHandling = function (series, updated, removed, duration) {
        // Run after transition methods
        if (duration === 0) {
            updated.each(function (d, i) {
                if (series.afterDraw !== null && series.afterDraw !== undefined) {
                    series.afterDraw(this, d, i);
                }
            });
            removed.remove();
        } else {
            updated.each("end", function (d, i) {
                if (series.afterDraw !== null && series.afterDraw !== undefined) {
                    series.afterDraw(this, d, i);
                }
            });
            removed.each("end", function () {
                d3.select(this).remove();
            });
        }
    };