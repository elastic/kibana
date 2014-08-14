define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');

    var renderYAxis = Private(require('components/vislib/components/YAxis/_draw'));

    function YAxis(data) {
      this.data = data.data;
      this.stackedData = data.stack();
      this.yStackMax = data.getYStackMax();
    }

    YAxis.prototype.draw = function () {
      return renderYAxis(this);
    };

    YAxis.prototype.ticks = function () {};
    YAxis.prototype.title = function () {};
    YAxis.prototype.chartTitle = function () {};

    return YAxis;
  };
});
