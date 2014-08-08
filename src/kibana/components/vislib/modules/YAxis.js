define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderYAxis = Private(require('components/vislib/utils/d3/XAxis/_y_axis'));

    _(YAxis).inherits(Chart);
    function YAxis(vis) {
      YAxis.Super.apply(this, arguments);
    }

    YAxis.prototype.draw = function (yAxis) {
      this.yAxis = yAxis;
      return renderYAxis(this);
    };

    YAxis.prototype.ticks = function () {};

    return YAxis;
  };
});
