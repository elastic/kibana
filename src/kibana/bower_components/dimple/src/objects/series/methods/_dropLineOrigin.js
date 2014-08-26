        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/_dropLineOrigin.js
        this._dropLineOrigin = function() {

            // Get the origin co-ordinates for axis drop lines
            var xIndex = 0,
                yIndex = 0,
                // This contains the drop line destinations
                coord = {
                    // The x co-ordinate for a y-axis drop line
                    x: null,
                    // The y co-ordinate for an x-axis drop line
                    y: null
                },
                // The origin of the first axes
                firstOrig = {
                    x: null,
                    y: null
                };
            // Get the first x and y first of all
            this.chart.axes.forEach(function (axis) {
                if (axis.position === "x" && firstOrig.x === null) {
                    if (axis._hasTimeField()) {
                        firstOrig.x = this.chart._xPixels();
                    } else {
                        firstOrig.x = axis._origin;
                    }
                } else if (axis.position === "y" && firstOrig.y === null) {
                    if (axis._hasTimeField()) {
                        firstOrig.y = this.chart._yPixels() + this.chart._heightPixels();
                    } else {
                        firstOrig.y = axis._origin;
                    }
                }
            }, this);
            // Get the axis position based on the axis index
            this.chart.axes.forEach(function (axis) {
                if (axis.position === "x" && !this.x.hidden) {
                    if (this._deepMatch(axis)) {
                        // Set the y co-ordinate for the x axis
                        if (xIndex === 0) {
                            coord.y = firstOrig.y;
                        } else if (xIndex === 1) {
                            coord.y = this.chart._yPixels();
                        }
                    }
                    xIndex += 1;
                } else if (axis.position === "y" && !this.y.hidden) {
                    if (this._deepMatch(axis)) {
                        // Set the x co-ordinate for the y axis 
                        if (yIndex === 0) {
                            coord.x = firstOrig.x;
                        } else if (yIndex === 1) {
                            coord.x = this.chart._xPixels() + this.chart._widthPixels();
                        }
                    }
                    yIndex += 1;
                }
            }, this);

            // Return the co-ordinate
            return coord;
        };