        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/_getFontSize.js
        this._getFontSize = function () {
            var fontSize;
            if (!this.fontSize || this.fontSize.toString().toLowerCase() === "auto") {
                fontSize = (this.chart._heightPixels() / 35 > 10 ? this.chart._heightPixels() / 35 : 10) + "px";
            } else if (!isNaN(this.fontSize)) {
                fontSize = this.fontSize + "px";
            } else {
                fontSize = this.fontSize;
            }
            return fontSize;
        };
