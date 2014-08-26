        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addColorAxis.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addColorAxis
        this.addColorAxis = function (measure, colors) {
            var colorAxis = this.addAxis("c", null, measure);
            colorAxis.colors = (colors === null || colors === undefined ? null : [].concat(colors));
            return colorAxis;
        };

