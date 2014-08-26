        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/storyboard/methods/_getCategories.js
        this._getCategories = function() {
            if (this._categoryFields !== this._cachedCategoryFields) {
                // Clear the array
                this._categories = [];
                // Iterate every row in the data
                this.chart._getAllData().forEach(function (d) {
                    // Initialise the index of the categories array matching the current row
                    var index = -1,
                        field = "";
                    // If this is a category axis handle multiple category values by iterating the fields in the row and concatonate the values
                    if (this.categoryFields !== null) {
                        this.categoryFields.forEach(function (cat, i) {
                            if (i > 0) {
                                field += "/";
                            }
                            field += d[cat];
                        }, this);
                        index = this._categories.indexOf(field);
                        if (index === -1) {
                            this._categories.push(field);
                            index = this._categories.length - 1;
                        }
                    }
                }, this);
                // Mark this as cached
                this._cachedCategoryFields = this._categoryFields;
            }
            // Return the array
            return this._categories;
        };