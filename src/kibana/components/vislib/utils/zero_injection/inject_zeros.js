define(function (require) {
  return function ZeroInjectionUtilService(Private) {
    var _ = require('lodash');

    var orderXValues = Private(require('components/vislib/utils/zero_injection/ordered_x_keys'));
    var createZeroFilledArray = Private(require('components/vislib/utils/zero_injection/zero_filled_array'));
    var zeroFillDataArray = Private(require('components/vislib/utils/zero_injection/zero_fill_data_array'));

    // Takes the kibana data.series array of objects
    // and the kibana data.ordered object
    return function (arr, obj) {
      var keys = orderXValues(arr);
      var max = arr.length;
      var i;

      // Looping thru each arr.values object and replacing
      // the y value of the zero-filled array
      for (i = 0; i < max; i++) {
        var zeroArray = createZeroFilledArray(keys, obj);
        var dataArray = arr[i].values;

        arr[i].values = zeroFillDataArray(zeroArray, dataArray);
      }

      // Returns a zero-filled array of objects
      return arr;
    };
  };
});
