/*
 * Main module
 * Accepts an html element and a config object.
 * Calls all other K4 modules.
 * Returns the charting function.
 */
define(function (require) {

  return function (elem, args) {
    var type = args.type,
      charts = {
        'histogram': require('components/vislib/modules/histogram'),
        'line': require('components/vislib/modules/lineChart'),
        'area': require('components/vislib/modules/areaChart'),
      };

    if (typeof (charts[type]) !== 'function') {
      throw type + ' is not a supported k4 function.';
    }

    var chartFunc = charts[type](elem, args);

    return chartFunc;
  };
});
