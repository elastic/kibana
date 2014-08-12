define(function (require) {
  return function UniqueXValuesUtilService(Private) {
    var _ = require('lodash');

    var flattenDataArray = Private(require('components/vislib/components/_functions/zero_injection/flatten_data'));

    // accepts a kibana data.series array of objects
    return function (obj) {
      var flattenedData = flattenDataArray(obj);
      var uniqueXValues = {};

      // Appends unique x values in the order they appear
      // to an empty object
      flattenedData.forEach(function (d, i) {
        var key = d.x;
        uniqueXValues[key] = uniqueXValues[key] === void 0 ? i : Math.max(i, uniqueXValues[key]);
      });

      // returns an object with unique x values in the correct order
      return uniqueXValues;
    };
  };
});
