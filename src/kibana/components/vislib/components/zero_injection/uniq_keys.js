define(function (require) {
  return function UniqueXValuesUtilService(Private) {
    var _ = require('lodash');

    var flattenDataArray = Private(require('components/vislib/components/zero_injection/flatten_data'));

    /*
     * Accepts a Kibana data object.
     * Returns an object with unique x axis values as keys with an object of
     * their index numbers and an isNumber boolean as their values.
     * e.g. { 'xAxisValue': { index: 1, isNumber: false }}, ...
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new TypeError('UniqueXValuesUtilService expects an object');
      }

      var flattenedData = flattenDataArray(obj);
      var uniqueXValues = {};

      flattenedData.forEach(function (d, i) {
        var key = d.x;

        uniqueXValues[key] = uniqueXValues[key] === void 0 ?
        { index: i, isNumber: _.isNumber(key) } :
        { index: Math.max(i, uniqueXValues[key].index), isNumber: _.isNumber(key) };
      });

      return uniqueXValues;
    };
  };
});
