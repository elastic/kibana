define(function (require) {
  var _ = require('lodash');

  return function VisFunctionsBaseClass(d3, Private) {
    var Data = Private(require('components/vislib/modules/Data'));
    var Layout = Private(require('components/vislib/modules/Layout'));
    var Legend = Private(require('components/vislib/modules/Legend'));
    var Tooltip = Private(require('components/vislib/modules/Tooltip'));
    var XAxis = Private(require('components/vislib/modules/XAxis'));
    var YAxis = Private(require('components/vislib/modules/YAxis'));
    var AxisTitle = Private(require('components/vislib/modules/AxisTitle'));
    var ChartTitle = Private(require('components/vislib/modules/ChartTitle'));

    function VisFunctions() {}

    VisFunctions.prototype.instantiateData = function (data) {
      this.data = new Data(data);
    };

    VisFunctions.prototype.renderLayout = function (data) {
      this.layout = new Layout(this.el, data);
      this.layout.render();
    };

    VisFunctions.prototype.renderLegend = function (legend, config) {
      this.legend = new Legend(legend, config);
      this.legend.render();
    };

    VisFunctions.prototype.renderTooltip = function (elClass, formatter) {
      this.tooltip = new Tooltip(elClass, formatter);
    };

    VisFunctions.prototype.renderChartTitles = function (splitType) {
      this.chartTitle = new ChartTitle(this.el, splitType);
      this.chartTitle.render();
    };

    VisFunctions.prototype.renderXAxis = function (args) {
      this.xAxis = new XAxis(args);
      this.xAxis.render();
    };

    VisFunctions.prototype.renderYAxis = function (yMax, height, margin) {
      this.yAxis = new YAxis(this.el, yMax, height, margin);
      this.yAxis.render();
    };

    VisFunctions.prototype.renderAxisTitles = function (xTitle, yTitle) {
      this.axisTitle = new AxisTitle(this.el, xTitle, yTitle);
      this.axisTitle.render();
    };

    VisFunctions.prototype.renderCharts = function (vis, charts) {
      var self = this;

      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          var chart = new vis.ChartClass(vis, this, chartData);

          // Bind events to the chart
          d3.rebind(chart, chart._attr.dispatch, 'on');

          // Bubbles the events up to the Vis Class and Events Class
          chart.on('click', function (e) {
            self.emit('click', e);
          });

          chart.on('hover', function (e) {
            self.emit('hover', e);
          });

          chart.on('brush', function (e) {
            self.emit('brush', e);
          });

          charts.push(chart);

          try {
            chart.render();
          } catch (error) {
            console.error(error.message);
          }
        });
    };

    return VisFunctions;
  };
});
