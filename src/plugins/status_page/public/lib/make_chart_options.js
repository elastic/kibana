
import formatNumber from './format_number';

module.exports = function makeChartOptions(type) {
  return {
    chart: {
      type: 'lineChart',
      height: 200,
      showLegend: false,
      showXAxis: false,
      showYAxis: false,
      useInteractiveGuideline: true,
      tooltips: true,
      pointSize: 0,
      color: ['#444', '#777', '#aaa'],
      margin: {
        top: 10,
        left: 0,
        right: 0,
        bottom: 20
      },
      xAxis: { tickFormat: function (d) { return formatNumber(d, 'time'); } },
      yAxis: { tickFormat: function (d) { return formatNumber(d, type); }, },
      y: function (d) { return d.y; },
      x: function (d) { return d.x; }
    }
  };
};
