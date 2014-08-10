define(function (require) {
  return function YAxisDrawUtilService(d3, Private) {
    var drawYAxis = Private(require('components/vislib/components/YAxis/_y_axis'));

    return function (that, yAxis) {
      that.yAxis = yAxis;
      return drawYAxis(that);
    };
  };
});
