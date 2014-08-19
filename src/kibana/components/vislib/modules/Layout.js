define(function (require) {
  return function LayoutFactory(d3) {
    var _ = require('lodash');
    var $ = require('jquery');

    function Layout(el, data) {
      this.el = el;
      this.data = data;
    }

    Layout.prototype.render = function () {
      // Remove all elements from the current visualization
      this.removeAll();

      // Create the layout
      this.layout();

      // Split the layout elements
      this.split();
    };

    Layout.prototype.layout = function () {
      // 1. Create the visualization wrapper element
      var vis = d3.select(this.el).datum(this.data)
        .append('div')
        .attr('class', 'vis-wrapper');

      // 2. Append yAxis
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

      // 3. Append the visualization element
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

      // 4. Append the Legend element
      var legend = vis.append('div')
        .attr('class', 'legend-col-wrapper');

      // 5. Append the Tooltip element
      var tooltip = vis.append('div')
        .attr('class', 'k4tip');

      return vis;
    };

    Layout.prototype.split = function () {
      // Split y axis div wrapper
      d3.select('.y-axis-div-wrapper').call(this.yAxisSplit());

      // Split chart titles
      this.splitChartTitles();

      // Split chart wrapper
      d3.select('.chart-wrapper').call(this.chartSplit());

      // Split x axis div wrapper
      d3.select('.x-axis-div-wrapper').call(this.xAxisSplit());
    };

    Layout.prototype.splitChartTitles = function () {
      if ($('.y-axis-chart-title').length) {
        d3.select('.y-axis-chart-title').call(this.chartTitleSplit());
      }

      if ($('.x-axis-chart-title').length) {
        d3.select('.x-axis-chart-title').call(this.chartTitleSplit());
      }
    };

    Layout.prototype.yAxisSplit = function () {
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          div.selectAll('.y-axis-div')
            .append('div')
            .data(function (d) {
              return d.rows ? d.rows : [d];
            })
            .enter()
            .append('div')
            .attr('class', 'y-axis-div');
        });
      };
    };

    Layout.prototype.xAxisSplit = function () {
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          div.selectAll('.x-axis-div')
            .append('div')
            .data(function (d) {
              return d.columns ? d.columns : [d];
            })
            .enter()
            .append('div')
            .attr('class', 'x-axis-div');
        });
      };
    };

    Layout.prototype.chartSplit = function () {
      return function split(selection) {
        selection.each(function (data) {
          var div = d3.select(this)
            .attr('class', function () {
              return data.rows ? 'chart-wrapper-row' : data.columns ? 'chart-wrapper-column' : 'chart-wrapper';
            });
          var divClass;

          var charts = div.selectAll('charts')
            .append('div')
            .data(function (d) {
              divClass = d.rows ? 'chart-row' : d.columns ? 'chart-column' : 'chart';
              return d.rows ? d.rows : d.columns ? d.columns : [d];
            })
            .enter().append('div')
            .attr('class', function () {
              return divClass;
            });

          if (!data.series) {
            charts.call(split);
          }
        });
      };
    };

    Layout.prototype.chartTitleSplit = function () {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          if (!data.series) {
            div.selectAll('.chart-title').append('div')
              .data(function (d) {
                return d.rows ? d.rows : d.columns;
              })
              .enter().append('div')
              .attr('class', 'chart-title');

            if (data.rows) {
              d3.select('.x-axis-chart-title').remove();
            } else {
              d3.select('.y-axis-chart-title').remove();
            }

            return div;
          }

          return d3.select(this).remove();
        });
      };
    };

    Layout.prototype.removeAll = function () {
      return d3.select(this.el).selectAll('*').remove();
    };

    return Layout;
  };
});
