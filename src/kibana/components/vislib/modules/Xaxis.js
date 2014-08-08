define(function (require) {
  return function XAxisFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderXAxis = Private(require('components/vislib/utils/d3/XAxis/_x_axis'));

    _(XAxis).inherits(Chart);
    function XAxis(vis) {
      XAxis.Super.apply(this, arguments);
    }

    XAxis.prototype.draw = function (xAxis) {
      this.xAxis = xAxis;
      return renderXAxis(this);
    };

    XAxis.prototype.rotateTickLabels = function () {};
    XAxis.prototype.ticks = function () {};

    return XAxis;
  };
});
