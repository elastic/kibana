define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var getUniqKeys = Private(require('components/vislib/components/zero_injection/uniq_keys'));

    /*
     * Accepts a Kibana data object and returns
     * an array of x axis values ordered by their index number.
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new Error('OrderedXKeysUtilService expects an object');
      }

      var objKeys = getUniqKeys(obj);

      return _.chain(objKeys)
      .pairs()
      .sortBy(function (d) {
        if (d[1].isNumber) {
          // sort by index
          return +d[0];
        }
      })
      .map(function (d) {
        return d[1].isNumber ? +d[0] : d[0];
      })
      .value();
    };
  };
});