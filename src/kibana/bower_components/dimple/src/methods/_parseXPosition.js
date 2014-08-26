    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_parseXPosition.js
    dimple._parseXPosition = function (value, parent) {
        return dimple._parsePosition(value, dimple._parentWidth(parent));
    };
