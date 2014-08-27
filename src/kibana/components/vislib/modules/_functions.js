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
      try {
        this.layout.render();
      } catch (error) {
//        console.group(error.message);
      }
    };

    VisFunctions.prototype.renderLegend = function (legend, config, el) {
      this.legend = new Legend(legend, config, el);
      try {
        this.legend.render();
      } catch (error) {
//        console.group(error.message);
      }
    };

    VisFunctions.prototype.renderTooltip = function (elClass, formatter) {
      this.tooltip = new Tooltip(elClass, formatter);
    };

    VisFunctions.prototype.renderChartTitles = function (splitType) {
      this.chartTitle = new ChartTitle(this.el);
      try {
        this.chartTitle.render();
      } catch (error) {
//        console.group(error.message);
      }
    };

    VisFunctions.prototype.renderXAxis = function (args) {
      this.xAxis = new XAxis(args);
      try {
        this.xAxis.render();
      } catch (error) {
//        console.group(error.message);
      }
    };

    VisFunctions.prototype.renderYAxis = function (args) {
      this.yAxis = new YAxis(args);
      try {
        this.yAxis.render();
      } catch (error) {
//        console.group(error.message);
      }
    };

    VisFunctions.prototype.renderAxisTitles = function (xTitle, yTitle) {
      this.axisTitle = new AxisTitle(this.el, xTitle, yTitle);
      try {
        this.axisTitle.render();
      } catch (error) {
//        console.group(error.message);
      }
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
            if (error.message === 'yScale is undefined') {
              chart.error(self.el);
            } else {
              console.group(error.message);
            }
          }
        });
    };

    return VisFunctions;
  };
});
