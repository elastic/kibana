define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var getUniqKeys = Private(require('components/vislib/components/zero_injection/uniq_keys'));

    /*
     * Accepts a Kibana data object and returns
     * an array of x axis values.
     * values sorted by timestamp if isDate and Date Histogram agg
     * else values sorted by index
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new Error('OrderedXKeysUtilService expects an object');
      }

      var objKeys = getUniqKeys(obj);

      return _.chain(objKeys)
      .pairs()
      .sortBy(function (d) {
        if (d[1].isDate) {
          return +d[0];
        }
        return d[1].index;
      })
      .map(function (d) {
        return d[1].isNumber ? +d[0] : d[0];
      })
      .value();
    };
  };
});
