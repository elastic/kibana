define(function (require) {
  return function ColumnDrawUtilService(d3, Private) {
    var renderXAxis = Private(require('components/vislib/components/XAxis/_x_axis'));
    var split = Private(require('components/vislib/components/XAxis/_split_x_axis'));

    return function (that, xAxis) {
      that.xAxis = xAxis;
      return renderXAxis(that);
    };
  };
});
