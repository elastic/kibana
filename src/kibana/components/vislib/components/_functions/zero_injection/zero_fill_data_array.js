define(function (require) {
  return function ZeroFillDataArrayUtilService(Private) {
    var _ = require('lodash');

    var replaceIndex = Private(require('components/vislib/components/_functions/zero_injection/replace_index'));

    // Accepts an array of zero-filled y value objects
    // and a kibana data.series[i].values array of objects
    return function (arr1, arr2) {
      var getX = function (d) {
        return d.x === val.x;
      };
      var max = arr2.length;
      var i;
      var val;
      var index;

      for (i = 0; i < max; i++) {
        val = arr2[i];
        index = _.findIndex(arr1, getX);
        replaceIndex(arr1, index, val);
      }

      // Return a zero-filled array of objects
      return arr1;
    };
  };
});