        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/_isStacked.js
        this._isStacked = function() {
            return this.stacked && (this.x._hasCategories() || this.y._hasCategories());
        };