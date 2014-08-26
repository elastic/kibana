        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/storyboard/methods/goToFrame.js
        this.goToFrame = function (frameText) {
            if (this._getCategories().length > 0) {
                var index = this._getCategories().indexOf(frameText);
                this._goToFrameIndex(index);
            }
        };

