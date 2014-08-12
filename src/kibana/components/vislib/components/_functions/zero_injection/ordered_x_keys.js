define(function (require) {
  return function OrderedXKeysUtilService(Private) {
    var _ = require('lodash');
    var getObjKeys = Private(require('components/vislib/components/_functions/zero_injection/uniq_keys'));

    // Takes a kibana data objects
    return function (obj) {
      var objKeys = getObjKeys(obj);

      // Returns an array x axis values
      return _.chain(objKeys)
        .pairs()
//        .sortBy(1)
        .pluck(0)
        .value();
    };
  };
});