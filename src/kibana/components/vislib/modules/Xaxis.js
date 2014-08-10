define(function (require) {
  return function XAxisFactory(d3, Private) {
    var renderXAxis = Private(require('components/vislib/components/XAxis/_draw'));

    function XAxis(that) {
      this.data = that.data;
    }

    XAxis.prototype.draw = function (xAxis) {
      return renderXAxis(this, xAxis);
    };

    XAxis.prototype.rotateTickLabels = function () {};
    XAxis.prototype.ticks = function () {};

    return XAxis;
  };
});
