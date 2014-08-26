        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/legend/methods/_widthPixels.js
        // Access the pixel value of the width of the legend area
        this._widthPixels = function () {
            return dimple._parseXPosition(this.width, this.chart.svg.node());
        };