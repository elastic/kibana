    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_getSeriesOrder.js
    dimple._getSeriesOrder = function (data, series) {
        var rules = [].concat(series._orderRules),
            cats = series.categoryFields,
            returnValue = [];
        if (cats !== null && cats !== undefined && cats.length > 0) {
            if (series.c !== null && series.c !== undefined && series.c._hasMeasure()) {
                rules.push({ ordering : series.c.measure, desc : true });
            }
            if (series.x._hasMeasure()) {
                rules.push({ ordering : series.x.measure, desc : true });
            }
            if (series.y._hasMeasure()) {
                rules.push({ ordering : series.y.measure, desc : true });
            }
            returnValue = dimple._getOrderedList(data, cats, rules);
        }
        return returnValue;
    };
