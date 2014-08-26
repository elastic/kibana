// Copyright: 2014 PMSI-AlignAlytics
// License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
// Source: /src/objects/begin.js

// Wrap all application code in a self-executing function which handles optional AMD/CommonJS publishing
(function (context, dimple) {
    "use strict";

    if (typeof exports === "object") {
        // CommonJS
        module.exports = dimple(require('d3'));
    } else {
        if (typeof define === "function" && define.amd) {
            // RequireJS | AMD
            define(["d3"], function (d3) {
                // publish dimple to the global namespace for backwards compatibility
                // and define it as an AMD module
                context.dimple = dimple(d3);
                return context.dimple;
            });
        } else {
            // No AMD, expect d3 to exist in the current context and publish
            // dimple to the global namespace
            if (!context.d3) {
                if (console && console.warn) {
                    console.warn("dimple requires d3 to run.  Are you missing a reference to the d3 library?");
                } else {
                    throw "dimple requires d3 to run.  Are you missing a reference to the d3 library?";
                }
            } else {
                context.dimple = dimple(context.d3);
            }
        }
    }

}(this, function (d3) {
    "use strict";

    // Create the stub object
    var dimple = {
        version: "2.1.0",
        plot: {},
        aggregateMethod: {}
    };