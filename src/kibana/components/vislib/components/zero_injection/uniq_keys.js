define(function (require) {
  return function UniqueXValuesUtilService(Private) {
    var _ = require('lodash');

    var flattenDataArray = Private(require('components/vislib/components/zero_injection/flatten_data'));

    // accepts a kibana data.series array of objects
    return function (obj) {
      var flattenedData = flattenDataArray(obj);
      var uniqueXValues = {};

      // Appends unique x values in the order they appear to an empty object
      flattenedData.forEach(function (d, i) {
        var key = d.x;
        uniqueXValues[key] = uniqueXValues[key] === void 0 ?
        { index: i, isNumber: _.isNumber(key) } : { index: Math.max(i, uniqueXValues[key].index), isNumber: _.isNumber(key) };
      });

      // returns an object with unique x values
      return uniqueXValues;
    };
  };
});
