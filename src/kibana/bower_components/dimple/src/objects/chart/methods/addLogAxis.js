        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addLogAxis.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addLogAxis
        this.addLogAxis = function (position, logField, logBase) {
            var axis = this.addAxis(position, null, logField, null);
            if (logBase !== null && logBase !== undefined) {
                axis.logBase = logBase;
            }
            axis.useLog = true;
            return axis;
        };