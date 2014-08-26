        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_widthPixels.js
        // Access the pixel value of the width of the plot area
        this._widthPixels = function () {
            return dimple._parseXPosition(this.width, this.svg.node());
        };