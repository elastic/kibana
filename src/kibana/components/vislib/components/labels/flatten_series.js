define(function (require) {
  return function GetSeriesUtilService() {
    var _ = require('lodash');

    /*
     * Accepts a Kibana data object with a rows or columns key
     * and returns an array of flattened series values.
     */

    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns) {
        throw new TypeError('GetSeriesUtilService expects an object with either a rows or columns key');
      }

      obj = obj.rows ? obj.rows : obj.columns;

      return _.chain(obj)
      .pluck('series')
      .flatten()
      .value();
    };
  };
});
