        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/getTooltipText.js
        this.getTooltipText = function (e) {
            var rows = [];
            // Add the series categories
            if (this.categoryFields !== null && this.categoryFields !== undefined && this.categoryFields.length > 0) {
                this.categoryFields.forEach(function (c, i) {
                    if (c !== null && c !== undefined && e.aggField[i] !== null && e.aggField[i] !== undefined) {
                        // If the category name and value match don't display the category name
                        rows.push(c + (e.aggField[i] !== c ? ": " + e.aggField[i] : ""));
                    }
                }, this);
            }


            if (!this.p) {
                if (this.x) {
                    this.x._getTooltipText(rows, e);
                }
                if (this.y) {
                    this.y._getTooltipText(rows, e);
                }
                if (this.z) {
                    this.z._getTooltipText(rows, e);
                }
            } else {
                if (this.x && this.x._hasCategories()) {
                    this.x._getTooltipText(rows, e);
                }
                if (this.y && this.y._hasCategories()) {
                    this.y._getTooltipText(rows, e);
                }
                if (this.z && this.z._hasCategories()) {
                    this.z._getTooltipText(rows, e);
                }
                this.p._getTooltipText(rows, e);
            }
            if (this.c) {
                this.c._getTooltipText(rows, e);
            }
            // Get distinct text rows to deal with cases where 2 axes have the same dimensionality
            return rows.filter(function (elem, pos) { return rows.indexOf(elem) === pos; });
        };