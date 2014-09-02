define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');

    function Chart(vis, el, chartData) {
      if (!(this instanceof Chart)) {
        return new Chart(vis, el, chartData);
      }

      this.vis = vis;
      this.chartEl = el;
      this.chartData = chartData;
      this._attr = _.defaults(vis._attr || {}, {});
    }

    Chart.prototype.render = function () {
      return d3.select(this.chartEl).call(this.draw());
    };

    return Chart;
  };
});