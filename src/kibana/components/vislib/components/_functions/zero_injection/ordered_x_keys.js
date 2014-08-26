define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var getUniqKeys = Private(require('components/vislib/components/_functions/zero_injection/uniq_keys'));

    // Takes a kibana data objects
    return function (obj) {
      var objKeys = getUniqKeys(obj);

      // Returns an array x axis values
      return _.chain(objKeys)
        .pairs()
        .map(function (d) {
          return d[1].isNumber ? +d[0] : d[0];
        })
        .value();
    };
  };
});