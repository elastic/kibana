define(function (require) {
  return function GetArrayUtilService(Private) {
    var _ = require('lodash');

    var flattenSeries = Private(require('components/vislib/components/labels/flatten_series'));

    /* Takes a kibana obj object
     * for example:
     * {
     *   labels: '',
     *   rows: [...],
     *   raw: [...],
     *   ...,
     * };
     * Data object can have a key that has rows, columns, or series.
    */
    return function (obj) {

      if (!obj.series) {
        return flattenSeries(obj);
      }

      // Returns a kibana obj.series array of objects with values array
      return obj.series;
    };
  };
});