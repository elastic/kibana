define(function (require) {
  return function RemoveZerosUtilService(Private) {
    var _ = require('lodash');
    var withoutZeroSlices = Private(require('components/vislib/components/zero_removal/without_zero_slices'));

    function getDataArray(obj) {
      if (obj.rows) {
        return obj.rows;
      } else if (obj.columns) {
        return obj.columns;
      } else if (obj.slices) {
        return [obj];
      }
    }

    return function removeZeros(dataObj) {
      var data = getDataArray(dataObj);

      data.forEach(function (chart) {
        chart.slices = withoutZeroSlices(chart.slices);
      });

      return dataObj;
    };
  };
});