define(function (require) {
  return function HistogramChartFactory(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));
    var renderColumnChart = Private(require('components/vislib/utils/d3/ColumnChart/column'));

    _(ColumnChart).inherits(Chart);
    function ColumnChart(vis) {
      ColumnChart.Super.apply(this, arguments);
      this._attr = _.defaults(vis.config || {}, {
        'margin' : { top: 0, right: 0, bottom: 0, left: 0 },
        'offset' : 'zero'
      });
    }

    ColumnChart.prototype.draw = function () {
      return d3.selectAll('.chart').call(renderColumnChart(this));
    };

    return ColumnChart;
  };
});