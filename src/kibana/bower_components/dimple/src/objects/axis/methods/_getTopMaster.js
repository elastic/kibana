        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/_getTopMaster.js
        this._getTopMaster = function () {
            // The highest level master
            var topMaster = this;
            if (this.master !== null && this.master !== undefined) {
                topMaster = this.master._getTopMaster();
            }
            return topMaster;
        };
