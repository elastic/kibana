        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/storyboard/methods/_goToFrameIndex.js
        this._goToFrameIndex = function (index) {
            this._frame = index % this._getCategories().length;
            // Draw it with half duration, we want the effect of a 50% animation 50% pause.
            this.chart.draw(this.frameDuration / 2);
        };

