    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/color/begin.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.color
    dimple.color = function (fill, stroke, opacity) {

        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.color#wiki-fill
        this.fill = fill;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.color#wiki-stroke
        this.stroke = (stroke === null || stroke === undefined ? d3.rgb(fill).darker(0.5).toString() : stroke);
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.color#wiki-opacity
        this.opacity = (opacity === null || opacity === undefined ? 0.8 : opacity);
