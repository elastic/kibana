        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addPctAxis.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addPctAxis
        this.addPctAxis = function (position, measure, categories) {
            var pctAxis = null;
            if (categories !== null && categories !== undefined) {
                pctAxis = this.addAxis(position, categories, measure);
            } else {
                pctAxis = this.addMeasureAxis(position, measure);
            }
            pctAxis.showPercent = true;
            return pctAxis;
        };

