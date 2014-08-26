    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/methods/_parseYPosition.js
    dimple._parseYPosition = function (value, parent) {
        return dimple._parsePosition(value, dimple._parentHeight(parent));
    };
