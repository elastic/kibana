/*
 * Main module
 * Accepts an html element and a config object.
 * Calls all other K4 modules.
 * Returns the charting function.
 */

define(function(require) {
    "use strict";

    var histogram = require('./modules/histogram');

    return function(elem, args) {
        var type = args.type,
            charts = {
            'histogram': histogram
        };

        if (typeof(charts[type]) !== 'function') { throw type + " is not a supported k4 function."; }

        var chartFunc = charts[type](elem, args);

        return chartFunc;
    };
});
