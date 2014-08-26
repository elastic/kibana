        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/axis/methods/addOrderRule.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.axis#wiki-addOrderRule
        this.addOrderRule = function (ordering, desc) {
            this._orderRules.push({ ordering : ordering, desc : desc });
        };