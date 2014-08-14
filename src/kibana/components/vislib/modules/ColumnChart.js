define(function (require) {
  return function HistogramChartFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderColumnChart = Private(require('components/vislib/components/ColumnChart/column'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    _(ColumnChart).inherits(Chart);
    function ColumnChart(vis, chartEl, chartData) {
      ColumnChart.Super.apply(this, arguments);
      this.chartEl = chartEl;
      this.chartData = chartData;
      this.yStackMax = vis.yAxis.yStackMax;
      this._attr = _.defaults(vis.config || {}, {
        'margin' : { top: 0, right: 0, bottom: 0, left: 0 },
        'offset' : 'zero'
      });
    }

    ColumnChart.prototype.draw = function () {
      return renderColumnChart(this, this.chartEl, this.chartData);
    };

    return ColumnChart;
  };
});