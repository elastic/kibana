    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_removeTooltip.js
    /*jslint unparam: true */
    dimple._removeTooltip = function (e, shape, chart, series) {
        if (chart._tooltipGroup) {
            chart._tooltipGroup.remove();
        }
    };
    /*jslint unparam: false */
