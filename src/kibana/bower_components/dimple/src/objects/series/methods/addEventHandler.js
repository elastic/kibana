        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/series/methods/addEventHandler.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.series#wiki-addEventHandler
        this.addEventHandler = function (event, handler) {
            this._eventHandlers.push({ event: event, handler: handler });
        };

