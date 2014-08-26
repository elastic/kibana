        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addTimeAxis.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addTimeAxis
        this.addTimeAxis = function (position, timeField, inputFormat, outputFormat) {
            var axis = this.addAxis(position, null, null, timeField);
            axis.tickFormat = outputFormat;
            axis.dateParseFormat = inputFormat;
            return axis;
        };

