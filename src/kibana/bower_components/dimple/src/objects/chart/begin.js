    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/chart/begin.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart
    dimple.chart = function (svg, data) {

        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-svg
        this.svg = svg;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-x
        this.x = "10%";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-y
        this.y = "10%";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-width
        this.width = "80%";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-height
        this.height = "80%";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-data
        this.data = data;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-noFormats
        this.noFormats = false;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-axes
        this.axes = [];
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-series
        this.series = [];
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-legends
        this.legends = [];
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-storyboard
        this.storyboard = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-titleShape
        this.titleShape = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-shapes
        this.shapes = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-ease
        this.ease = "cubic-in-out";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-staggerDraw
        this.staggerDraw = false;

        // The group within which to put all of this chart's objects
        this._group = svg.append("g");
        // The group within which to put tooltips.  This is not initialised here because
        // the group would end up behind other chart contents in a multi chart output.  It will
        // therefore be added and removed by the mouse enter/leave events
        this._tooltipGroup = null;
        // Colors assigned to chart contents.  E.g. a series value.
        this._assignedColors = {};
        // The next colour index to use, this value is cycled around for all default colours
        this._nextColor = 0;
