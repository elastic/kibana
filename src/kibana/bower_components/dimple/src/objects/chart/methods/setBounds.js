        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/setBounds.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-setBounds
        this.setBounds = function (x, y, width, height) {
            // Store the passed parameters
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            // Access the pixel value of the x coordinate
            this._xPixels = function () {
                return dimple._parseXPosition(this.x, this.svg.node());
            };
            this.draw(0, true);
            // Access the pixel value of the y coordinate
            this._yPixels = function () {
                return dimple._parseYPosition(this.y, this.svg.node());
            };
            // Access the pixel value of the width coordinate
            this._widthPixels = function () {
                return dimple._parseXPosition(this.width, this.svg.node());
            };
            // Access the pixel value of the width coordinate
            this._heightPixels = function () {
                return dimple._parseYPosition(this.height, this.svg.node());
            };
            // Refresh the axes to redraw them against the new bounds
            // return the chart object for method chaining
            return this;
        };

