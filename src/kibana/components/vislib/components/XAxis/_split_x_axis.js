define(function (require) {
  return function SplitXAxisUtilService(d3, Private) {
    var xAxisWrapper = Private(require('components/vislib/components/XAxis/_x_axis_wrapper'));
    var splitXAxis = Private(require('components/vislib/components/XAxis/_split'));
    var call = Private(require('components/vislib/components/_functions/d3/_call_function'));

    return function (data) {
      return call(xAxisWrapper, data, splitXAxis);
    };
  };
});
