    // Copyright: 2014 PMSI-AlignAlytics
    // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
    // Source: /src/objects/storyboard/begin.js
    // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard
    dimple.storyboard = function (chart, categoryFields) {

        // Handle an individual string as an array
        if (categoryFields !== null && categoryFields !== undefined) {
            categoryFields = [].concat(categoryFields);
        }

        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-chart
        this.chart = chart;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-categoryFields
        this.categoryFields = categoryFields;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-autoplay
        this.autoplay = true;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-frameDuration
        this.frameDuration = 3000;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-storyLabel
        this.storyLabel = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-onTick
        this.onTick = null;
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-fontSize
        this.fontSize = "10px";
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.storyboard#wiki-fontFamily
        this.fontFamily = "sans-serif";

        // The current frame index
        this._frame = 0;
        // The animation interval
        this._animationTimer = null;
        // The category values
        this._categories = [];
        // The category values when the last cache happened
        this._cachedCategoryFields = [];
        // The rules for ordering the storyboard
        this._orderRules = [];
