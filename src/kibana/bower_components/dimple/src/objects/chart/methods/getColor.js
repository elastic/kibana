        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/getColor.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-getColor
        this.getColor = function (tag) {
            // If no color is assigned, do so here
            if (this._assignedColors[tag] === null || this._assignedColors[tag] === undefined) {
                this._assignedColors[tag] = this.defaultColors[this._nextColor];
                this._nextColor = (this._nextColor + 1) % this.defaultColors.length;
            }
            // Return the color
            return this._assignedColors[tag];
        };

