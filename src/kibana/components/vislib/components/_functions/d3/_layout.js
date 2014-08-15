define(function () {
  return function LayoutUtilService(d3) {
    return function (el) {
      var vis = d3.select(el).append('div')
        .attr('class', 'vis-wrapper');

      // 1. Append yAxis
      var yaxis = vis.append('div')
        .attr('class', 'y-axis-col-wrapper');
      var yAxisWrapper = yaxis.append('div')
        .attr('class', 'y-axis-col');
      yAxisWrapper.append('div')
        .attr('class', 'y-axis-title');
      yAxisWrapper.append('div')
        .attr('class', 'y-axis-chart-title');
      yAxisWrapper.append('div')
        .attr('class', 'y-axis-div-wrapper');
      yaxis.append('div')
        .attr('class', 'y-axis-spacer-block');


      // 2. Append vis column
      var chart = vis.append('div')
        .attr('class', 'vis-col-wrapper');
      chart.append('div')
        .attr('class', 'chart-wrapper');
      // append xAxis
      var xAxisWrapper = chart.append('div')
        .attr('class', 'x-axis-wrapper');
      xAxisWrapper.append('div')
        .attr('class', 'x-axis-div-wrapper');
      xAxisWrapper.append('div')
        .attr('class', 'x-axis-chart-title');
      xAxisWrapper.append('div')
        .attr('class', 'x-axis-title');


      // 3. Legend div
      var legend = vis.append('div')
        .attr('class', 'legend-col-wrapper');


      // 4. Tooltip
      var tooltip = vis.append('div')
        .attr('class', 'k4tip');

      return vis;
    };
  };
});
