define(function (require) {
  return function ZeroInjectionUtilService(Private) {
    var _ = require('lodash');

    var orderXValues = Private(require('components/vislib/components/zero_injection/ordered_x_keys'));
    var createZeroFilledArray = Private(require('components/vislib/components/zero_injection/zero_filled_array'));
    var zeroFillDataArray = Private(require('components/vislib/components/zero_injection/zero_fill_data_array'));

    /*
     * A Kibana data object may have multiple series with different array lengths.
     * This proves an impediment to stacking in the visualization library.
     * Therefore, zero values must be injected wherever these arrays do not line up.
     * That is, each array must have the same x values with zeros filled in where the
     * x values were added.
     *
     * This function and its helper functions accepts a Kibana data object
     * and injects zeros where needed.
     */

    return function (obj) {
      if (!_.isObject(obj) || !obj.rows && !obj.columns && !obj.series) {
        throw new TypeError('ZeroInjectionUtilService expects an object with a series, rows, or columns key');
      }

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

      max = obj.series.length;

      for (i = 0; i < max; i++) {
        zeroArray = createZeroFilledArray(keys);
        dataArray = obj.series[i].values;

        obj.series[i].values = zeroFillDataArray(zeroArray, dataArray);
      }

      return obj;
    };
  };
});
