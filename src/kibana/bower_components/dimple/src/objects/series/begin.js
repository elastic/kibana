    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/series/begin.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series
    dimple.series = function (chart, categoryFields, xAxis, yAxis, zAxis, colorAxis, pieAxis, plotFunction, aggregateFunction, stacked) {

        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-chart
        this.chart = chart;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-x
        this.x = xAxis;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-y
        this.y = yAxis;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-z
        this.z = zAxis;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-c
        this.c = colorAxis;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-p
        this.p = pieAxis;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-plot
        this.plot = plotFunction;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-categoryFields
        this.categoryFields = categoryFields;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-aggregateFunction
        this.aggregate = aggregateFunction;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-stacked
        this.stacked = stacked;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-barGap
        this.barGap = 0.2;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-clusterBarGap
        this.clusterBarGap = 0.1;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-lineWeight
        this.lineWeight = 2;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-lineMarkers
        this.lineMarkers = false;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-afterDraw
        this.afterDraw = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-interpolation
        this.interpolation = "linear";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-fontSize
        this.tooltipFontSize = "10px";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-fontFamily
        this.tooltipFontFamily = "sans-serif";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-radius
        this.radius = "auto";

        // Any event handlers joined to this series
        this._eventHandlers = [];
        // The series positioning information
        this._positionData = [];
        // The order definition array
        this._orderRules = [];
