    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/aggregateMethod/sum.js
    dimple.aggregateMethod.sum = function (lhs, rhs) {
        lhs.value = (lhs.value === null || lhs.value === undefined ? 0 : parseFloat(lhs.value));
        rhs.value = (rhs.value === null || rhs.value === undefined ? 0 : parseFloat(rhs.value));
        return lhs.value + rhs.value;
    };
