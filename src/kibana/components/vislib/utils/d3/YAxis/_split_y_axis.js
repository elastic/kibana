define(function (require) {
  return function SplitYAxisUtilService(d3, Private) {
    var yAxisWrapper = Private(require('components/vislib/utils/d3/YAxis/_y_axis_wrapper'));
    var splitYAxis = Private(require('components/vislib/utils/d3/YAxis/_split'));
    var call = Private(require('components/vislib/utils/d3/_call_function'));

    return function (that) {
      return call(yAxisWrapper, that.data, splitYAxis);
    };
  };
});
