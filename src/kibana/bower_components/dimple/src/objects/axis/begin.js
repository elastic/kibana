    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/axis/begin.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis
    dimple.axis = function (chart, position, categoryFields, measure, timeField) {

        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-chart
        this.chart = chart;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-position
        this.position = position;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-categoryFields
        this.categoryFields = (timeField === null || timeField === undefined ? categoryFields : [].concat(timeField));
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-measure
        this.measure = measure;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-timeField
        this.timeField = timeField;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-floatingBarWidth
        this.floatingBarWidth = 5;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-hidden
        this.hidden = false;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-showPercent
        this.showPercent = false;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-colors
        this.colors = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-overrideMin
        this.overrideMin = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-overrideMax
        this.overrideMax = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-shapes
        this.shapes = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-showGridlines
        this.showGridlines = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-gridlineShapes
        this.gridlineShapes = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-titleShape
        this.titleShape = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-dateParseFormat
        this.dateParseFormat = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-tickFormat
        this.tickFormat = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-timePeriod
        this.timePeriod = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-timeInterval
        this.timeInterval = 1;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-useLog
        this.useLog = false;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-logBase
        this.logBase = 10;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-title
        this.title = undefined;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-clamp
        this.clamp = true;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-ticks
        this.ticks = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-fontSize
        this.fontSize = "10px";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-fontFamily
        this.fontFamily = "sans-serif";

        // If this is a composite axis, store links to all slaves
        this._slaves = [];
        // The scale determined by the update method
        this._scale = null;
        // The minimum and maximum axis values
        this._min = 0;
        this._max = 0;
        // Chart origin before and after an update.  This helps
        // with transitions
        this._previousOrigin = null;
        this._origin = null;
        // The order definition array
        this._orderRules = [];
        // The group order definition array
        this._groupOrderRules = [];

