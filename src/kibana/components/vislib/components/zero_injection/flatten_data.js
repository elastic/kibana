define(function (require) {
  return function FlattenDataObjectUtilService() {
    var _ = require('lodash');

    /*
     * Accepts a Kibana data object, flattens the data.series values array,
     * and returns an array of values objects.
     */

    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('FlattenDataObjUtilService expects an object with a series, rows, or columns key');
      }

      if (!obj.series) {
        obj = obj.rows ? obj.rows : obj.columns;

        return _.chain(obj)
        .pluck('series')
        .flatten()
        .pluck('values')
        .flatten()
        .value();
      }

      return _.flatten(obj.series, 'values');
    };
  };
});