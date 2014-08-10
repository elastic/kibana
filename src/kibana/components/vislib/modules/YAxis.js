define(function (require) {
  return function YAxisFactory(d3, Private) {
    var renderYAxis = Private(require('components/vislib/components/YAxis/_draw'));

    function YAxis() {}

    YAxis.prototype.draw = function (yAxis) {
      return renderYAxis(this, yAxis);
    };

    YAxis.prototype.ticks = function () {};
    YAxis.prototype.title = function () {};
    YAxis.prototype.chartTitle = function () {};

    return YAxis;
  };
});
