define(function (require) {
  return function ZeroInjectionUtilService(Private) {
    var _ = require('lodash');

    var orderXValues = Private(require('components/vislib/components/zero_injection/ordered_x_keys'));
    var createZeroFilledArray = Private(require('components/vislib/components/zero_injection/zero_filled_array'));
    var zeroFillDataArray = Private(require('components/vislib/components/zero_injection/zero_fill_data_array'));

    // Takes the kibana data objects
    return function (obj) {
      var keys = orderXValues(obj);
      var max;
      var zeroArray;
      var dataArray;
      var i;
      var j;

      if (!obj.series) {
        var arr = obj.rows ? obj.rows : obj.columns;
        max = arr.length;

        for (i = 0; i < max; i++) {
          var jMax = arr[i].series.length;

          for (j = 0; j < jMax; j++) {
            zeroArray = createZeroFilledArray(keys);
            dataArray = arr[i].series[j].values;
            arr[i].series[j].values = zeroFillDataArray(zeroArray, dataArray);
          }
        }

        return obj;
      }

      // Looping thru each arr.values object and replacing
      // the y value of the zero-filled array
      max = obj.series.length;

      for (i = 0; i < max; i++) {
        zeroArray = createZeroFilledArray(keys);
        dataArray = obj.series[i].values;

        obj.series[i].values = zeroFillDataArray(zeroArray, dataArray);
      }

      // Returns a zero-filled array of objects
      return obj;
    };
  };
});
