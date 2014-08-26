        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/_getTooltipFontSize.js
        this._getTooltipFontSize = function () {
            var fontSize;
            if (!this.tooltipFontSize || this.tooltipFontSize.toString().toLowerCase() === "auto") {
                fontSize = (this.chart._heightPixels() / 35 > 10 ? this.chart._heightPixels() / 35 : 10) + "px";
            } else if (!isNaN(this.tooltipFontSize)) {
                fontSize = this.tooltipFontSize + "px";
            } else {
                fontSize = this.tooltipFontSize;
            }
            return fontSize;
        };
