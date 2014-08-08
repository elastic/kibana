define(function (require) {
  return function SplitXAxisUtilService(d3, Private) {
    var xAxisWrapper = Private(require('components/vislib/utils/d3/XAxis/_x_axis_wrapper'));
    var splitXAxis = Private(require('components/vislib/utils/d3/XAxis/_split'));
    var call = Private(require('components/vislib/utils/d3/_call_function'));

    return function (data) {
      return call(xAxisWrapper, data, splitXAxis);
    };
  };
});
