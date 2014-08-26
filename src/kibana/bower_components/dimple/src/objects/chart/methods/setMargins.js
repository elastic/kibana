        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/setMargins.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-setMargins
        this.setMargins = function (left, top, right, bottom) {
            // Set the bounds here, functions below will be used for access
            this.x = left;
            this.y = top;
            this.width = 0;
            this.height = 0;
            // Access the pixel value of the x coordinate
            this._xPixels = function () {
                return dimple._parseXPosition(this.x, this.svg.node());
            };
            // Access the pixel value of the y coordinate
            this._yPixels = function () {
                return dimple._parseYPosition(this.y, this.svg.node());
            };
            // Access the pixel value of the width coordinate
            this._widthPixels = function () {
                return dimple._parentWidth(this.svg.node()) - this._xPixels() - dimple._parseXPosition(right, this.svg.node());
            };
            // Access the pixel value of the width coordinate
            this._heightPixels = function () {
                return dimple._parentHeight(this.svg.node()) - this._yPixels() - dimple._parseYPosition(bottom, this.svg.node());
            };
            // Refresh the axes to redraw them against the new bounds
            this.draw(0, true);
            // return the chart object for method chaining
            return this;
        };

