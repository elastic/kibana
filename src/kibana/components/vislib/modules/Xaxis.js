define(function (require) {
  return function XAxisFactory(d3, Private) {
    var _ = require('lodash');

    var renderXAxis = Private(require('components/vislib/components/XAxis/_draw'));

    function XAxis(data) {
      this.data = data.data;
      this.xValues = data.orderedKeys ? data.orderedKeys : data.xValues();
      this.xAxisFormatter = data.xAxisFormatter ? data.xAxisFormatter : data.get('xAxisFormatter');
    }

    XAxis.prototype.draw = function () {
      return renderXAxis(this);
    };

    XAxis.prototype.rotateTickLabels = function () {};
    XAxis.prototype.ticks = function () {};

    return XAxis;
  };
});
