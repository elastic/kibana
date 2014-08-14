define(function () {
  return function LayoutUtilService(d3) {
    return function (el) {
      var vis = d3.select(el).append('div')
        .attr('class', 'vis-wrapper');

      var yaxis = vis.append('div')
        .attr('class', 'y-axis-col-wrapper');

      var yAxisWrapper = yaxis.append('div')
        .attr('class', 'y-axis-col');
      yAxisWrapper.append('div')
        .attr('class', 'y-axis-title');
      yAxisWrapper.append('div')
        .attr('class', 'y-axis-div-wrapper');

      yaxis.append('div')
        .attr('class', 'y-axis-spacer-block');

      var chart = vis.append('div')
        .attr('class', 'vis-col-wrapper');
      chart.append('div')
        .attr('class', 'chart-wrapper');

      var xAxisWrapper = chart.append('div')
        .attr('class', 'x-axis-wrapper');
      xAxisWrapper.append('div')
        .attr('class', 'x-axis-div-wrapper');
      xAxisWrapper.append('div')
        .attr('class', 'x-axis-title');

      var legend = vis.append('div')
        .attr('class', 'legend-col-wrapper');
      
      var tooltip = vis.append('div')
        .attr('class', 'k4tip');

      return vis;
    };
  };
});
