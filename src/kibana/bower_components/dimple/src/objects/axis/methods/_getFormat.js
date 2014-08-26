        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/_getFormat.js
        this._getFormat = function () {
            var returnFormat,
                max,
                min,
                len,
                chunks,
                suffix,
                dp;
            if (this.tickFormat !== null && this.tickFormat !== undefined) {
                if (this._hasTimeField()) {
                    returnFormat = d3.time.format(this.tickFormat);
                } else {
                    returnFormat = d3.format(this.tickFormat);
                }
            } else if (this.showPercent) {
                returnFormat = d3.format("%");
            } else if (this.useLog && this.measure !== null) {
                // With linear axes the range is used to apply uniform
                // formatting but with a log axis it is based on each number
                // independently
                returnFormat = function (n) {
                    var l = Math.floor(Math.abs(n), 0).toString().length,
                        c = Math.min(Math.floor((l - 1) / 3), 4),
                        s = "kmBT".substring(c - 1, c),
                        d = (Math.round((n / Math.pow(1000, c)) * 10).toString().slice(-1) === "0" ? 0 : 1);
                    return (n === 0 ? 0 : d3.format(",." + d + "f")(n / Math.pow(1000, c)) + s);
                };
            } else if (this.measure !== null) {
                max = Math.floor(Math.abs(this._max), 0).toString();
                min = Math.floor(Math.abs(this._min), 0).toString();
                len = Math.max(min.length, max.length);
                if (len > 3) {
                    chunks = Math.min(Math.floor((len - 1) / 3), 4);
                    suffix = "kmBT".substring(chunks - 1, chunks);
                    dp = (len - chunks * 3 <= 1 ? 1 : 0);
                    returnFormat = function (n) {
                        return (n === 0 ? 0 : d3.format(",." + dp + "f")(n / Math.pow(1000, chunks)) + suffix);
                    };
                } else {
                    dp = (len <= 1 ? 1 : 0);
                    returnFormat = d3.format(",." + dp + "f");
                }
            } else {
                returnFormat = function (n) { return n; };
            }
            return returnFormat;
        };
