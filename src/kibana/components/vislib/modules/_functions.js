define(function (require) {
  return function ChartFunctionsBaseClass(d3, Private) {

    var split = Private(require('components/vislib/utils/d3/_split'));
    var injectZeros = Private(require('components/vislib/utils/zero_injection/inject_zeros'));
    var yStackMax = Private(require('components/vislib/utils/d3/_functions/_y_stack_max'));
    var getLabels = Private(require('components/vislib/utils/labels/labels'));
    var color = Private(require('components/vislib/utils/color/color'));
    var callFunction = Private(require('components/vislib/utils/d3/_call_function'));
    var removeAll = Private(require('components/vislib/utils/d3/_remove_all'));

    function ChartFunctions() {}

    ChartFunctions.prototype.injectZeros = function (arr, obj) {
      return injectZeros(arr, obj);
    };

    ChartFunctions.prototype.yStackMax = function (stackedData) {
      return yStackMax(stackedData);
    };

    ChartFunctions.prototype.getLabels = function (obj) {
      return getLabels(obj);
    };

    ChartFunctions.prototype.color = function (arr) {
      return color(arr);
    };

    ChartFunctions.prototype.callFunction = function (el, data, callback) {
      return callFunction(el, data, callback);
    };

    ChartFunctions.prototype.removeAll = function (el) {
      return removeAll(el);
    };

    ChartFunctions.prototype.drawXAxis = function () {};
    ChartFunctions.prototype.drawYAxis = function () {};
    ChartFunctions.prototype.xScale = function () {};
    ChartFunctions.prototype.yScale = function () {};

    return ChartFunctions;
  };
});
