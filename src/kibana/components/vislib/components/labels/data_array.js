define(function (require) {
  return function GetArrayUtilService(Private) {
    var _ = require('lodash');

    var flattenSeries = Private(require('components/vislib/components/labels/flatten_series'));

    /*
     * Accepts a Kibana data object and returns an array of values objects.
    */

    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('GetArrayUtilService expects an object with a series, rows, or columns key');
      }

      if (!obj.series) {
        return flattenSeries(obj);
      }

      return obj.series;
    };
  };
});