define(function (require) {
  return function SplitYAxisUtilService(d3, Private) {
    var yAxisWrapper = Private(require('components/vislib/components/YAxis/_y_axis_wrapper'));
    var splitYAxis = Private(require('components/vislib/components/YAxis/_split'));
    var call = Private(require('components/vislib/components/_functions/d3/_call_function'));

    return function (data) {
      return call(yAxisWrapper, data, splitYAxis);
    };
  };
});
