        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/_deepMatch.js
        this._deepMatch = function (axis) {
            // Return true if this series is dependant on the axis or any of its dependants
            var match = false;
            if (this[axis.position] === axis) {
                match = true;
            } else if (axis._slaves !== undefined && axis._slaves !== null && axis._slaves.length > 0) {
                axis._slaves.forEach(function (slave) {
                    match = (match || this._deepMatch(slave));
                }, this);
            }
            return match;
        };

