    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_parsePosition.js
    dimple._parsePosition = function (value, maxValue) {
        var returnValue = 0,
            values;
        if (value) {
            values = value.toString().split(",");
            values.forEach(function (v) {
                if (v) {
                    if (!isNaN(v)) {
                        returnValue += parseFloat(v);
                    } else if (v.slice(-1) === "%") {
                        returnValue += maxValue * (parseFloat(v.slice(0, v.length - 1)) / 100);
                    } else if (v.slice(-2) === "px") {
                        returnValue += parseFloat(v.slice(0, v.length - 2));
                    } else {
                        returnValue = value;
                    }
                }
            }, this);
        }
        // Take the position from the extremity if the value is negative
        if (returnValue < 0) {
            returnValue = maxValue + returnValue;
        }
        return returnValue;
    };
