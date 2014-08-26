        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/_xPixels.js
        // Access the pixel position of the x co-ordinate of the plot area
        this._xPixels = function () {
            return dimple._parseXPosition(this.x, this.svg.node());
        };