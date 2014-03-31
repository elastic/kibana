/*
 * Main module
 * Accepts an html element and a config object.
 * Calls all other K4 modules.
 * Returns the charting function.
 */

k4.Chart = function(elem, args) {
    'use strict';

    if (typeof(k4[args.type]) !== 'function') { throw args.type + " is not a supported k4 function."; }

    var type = args.type,
        chartFunc = k4[type](elem, args);

    return chartFunc;
};


