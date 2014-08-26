        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/assignColor.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-assignColor
        this.assignColor = function (tag, fill, stroke, opacity) {
            this._assignedColors[tag] = new dimple.color(fill, stroke, opacity);
            return this._assignedColors[tag];
        };

