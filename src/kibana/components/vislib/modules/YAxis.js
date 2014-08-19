define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');

    var renderYAxis = Private(require('components/vislib/components/YAxis/_draw'));

    function YAxis(data) {
      this.data = data.data;
      this.yMax = data.getYMaxValue();
    }

    YAxis.prototype.draw = function () {
      return renderYAxis(this);
    };

    YAxis.prototype.getYScale = function () {
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([this.height, 0])
        .nice();
    };

    YAxis.prototype.ticks = function () {};
    YAxis.prototype.title = function () {};
    YAxis.prototype.chartTitle = function () {};

    return YAxis;
  };
});
