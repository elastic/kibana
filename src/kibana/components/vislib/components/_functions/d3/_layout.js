define(function () {
  return function LayoutUtilService(d3) {
    return function (el) {
      var vis = d3.select(el).append('div')
        .attr('class', 'vis-wrapper');

      var yaxis = vis.append('div')
        .attr('class', 'y-axis-col-wrapper');
      yaxis.append('div')
        .attr('class', 'y-axis-col');
      yaxis.append('div')
        .attr('class', 'y-axis-spacer-block');

      var chart = vis.append('div')
        .attr('class', 'vis-col-wrapper');
      chart.append('div')
        .attr('class', 'chart-wrapper');
      chart.append('div')
        .attr('class', 'x-axis-wrapper');

      var legend = vis.append('div')
        .attr('class', 'legend-col-wrapper');

      var tooltip = vis.append('div')
        .attr('class', 'k4tip');

      return vis;
    };
  };
});
