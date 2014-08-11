define(function (require) {
  return function ChartFunctionsBaseClass(d3, Private) {

    var injectZeros = Private(require('components/vislib/components/_functions/zero_injection/inject_zeros'));
    var yStackMax = Private(require('components/vislib/components/_functions/d3/_y_stack_max'));
    var getLabels = Private(require('components/vislib/components/_functions/labels/labels'));
    var color = Private(require('components/vislib/components/_functions/color/color'));
    var callFunction = Private(require('components/vislib/components/_functions/d3/_call_function'));
    var removeAll = Private(require('components/vislib/components/_functions/d3/_remove_all'));
    var layout = Private(require('components/vislib/components/_functions/d3/_layout'));

    function ChartFunctions() {}

    ChartFunctions.prototype.layout = function (el) {
      return layout(el);
    };

    ChartFunctions.prototype.injectZeros = function (arr, obj) {
      return injectZeros(arr, obj);
    };

    ChartFunctions.prototype.yStackMax = function (stackedData) {
      return yStackMax(stackedData);
    };

    ChartFunctions.prototype.getLabels = function (obj) {
      return getLabels(obj);
    };

    ChartFunctions.prototype.getColor = function (arr) {
      return color(arr);
    };

    ChartFunctions.prototype.callFunction = function (el, data, callback) {
      return callFunction(el, data, callback);
    };

    ChartFunctions.prototype.removeAll = function (el) {
      return removeAll(el);
    };

    return ChartFunctions;
  };
});
