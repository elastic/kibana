        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/_parseDate.js
        this._parseDate = function (inDate) {
            // A javascript date object
            var outDate;
            if (this.dateParseFormat === null || this.dateParseFormat === undefined) {
                // Moved this into the condition so that using epoch time requires no data format to be set.
                // For example 20131122 might be parsed as %Y%m%d not treated as epoch time.
                if (!isNaN(inDate)) {
                    // If inDate is a number, assume it's epoch time
                    outDate = new Date(inDate);
                } else {
                    // If nothing has been explicity defined you are in the hands of the browser gods
                    // may they smile upon you...
                    outDate = Date.parse(inDate);
                }
            } else {
                outDate = d3.time.format(this.dateParseFormat).parse(inDate);
            }
            // Return the date
            return outDate;
        };

