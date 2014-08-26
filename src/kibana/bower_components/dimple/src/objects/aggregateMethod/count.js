    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/aggregateMethod/count.js
    dimple.aggregateMethod.count = function (lhs, rhs) {
        lhs.count = (lhs.count === null || lhs.count === undefined ? 0 : parseFloat(lhs.count));
        rhs.count = (rhs.count === null || rhs.count === undefined ? 0 : parseFloat(rhs.count));
        return lhs.count + rhs.count;
    };
