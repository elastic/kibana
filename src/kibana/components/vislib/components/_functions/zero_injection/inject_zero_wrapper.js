define(function (require) {
  return function ZeroInjectionWrapperUtilService(Private) {
    var _ = require('lodash');

    var injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));

    return function (obj) {
      var arr;
      
      // rows or columns
      if (!obj.series) {
        arr = obj.rows ? obj.rows : obj.columns;

        var flatArray = _.chain(arr)
        .pluck('series')
        .flatten()
        .value();
        console.log('flatArray', flatArray);

        for (var i = 0; i < arr.length; i++) {
          arr[i].series = injectZeros(arr[i].series, arr[i].ordered);
        }
      }

      // series
      arr = injectZeros(arr, obj.ordered);

      // obj.rows or obj.cols
      obj.series = injectZeros(obj.series, obj.ordered);

      console.log(obj);
      return obj;

    };

  };
});