define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var getObjKeys = Private(require('components/vislib/components/_functions/zero_injection/uniq_keys'));

    // Takes a kibana data.series array of objects
    return function (arr) {
      var obj = getObjKeys(arr);

      // Returns an array x axis values
      return _.chain(obj)
        .pairs()
//        .sortBy(1)
        .pluck(0)
        .value();
    };
  };
});