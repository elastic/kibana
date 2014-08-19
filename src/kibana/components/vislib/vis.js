define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    // VisLib Visualization Types
    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

    // VisLib Classes
    var Data = Private(require('components/vislib/modules/Data'));
    var Layout = Private(require('components/vislib/modules/Layout'));
    var Legend = Private(require('components/vislib/modules/Legend'));
    var Tooltip = Private(require('components/vislib/modules/Tooltip'));
    var XAxis = Private(require('components/vislib/modules/XAxis'));
    var YAxis = Private(require('components/vislib/modules/YAxis'));
    var AxisTitle = Private(require('components/vislib/modules/AxisTitle'));
    var ChartTitle = Private(require('components/vislib/modules/ChartTitle'));

    function Vis($el, config) {
      this.el = $el.get ? $el.get(0) : $el;
      this.config = config;
      this.ChartClass = chartTypes[config.type];
    }

    Vis.prototype.render = function (data) {
      var color;
      var labels;
      var tooltipFormatter;
      var zeroInjectedData;
      var type;

      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = new Data(data);
      color = this.data.color ? this.data.color : this.data.getColorFunc();
      labels = this.data.labels ? this.data.labels : this.data.getLabels();
      tooltipFormatter = this.data.tooltipFormatter ? this.data.tooltipFormatter :
        this.data.get('tooltipFormatter');

      // LAYOUT OBJECT
      // clears the el
      zeroInjectedData = this.data.injectZeros();
      this.layout = new Layout(this.el, zeroInjectedData);
      this.layout.render();

      // LEGEND OBJECT
      if (this.config.addLegend) {
        this.legend = new Legend({
          color: color,
          labels: labels
        }, this.config);
        this.legend.render();
      }

      // TOOLTIP OBJECT
      if (this.config.addTooltip) {
        this.tooltip = new Tooltip('k4tip', tooltipFormatter);
      }

      // CHART TITLE OBJECT
      type = this.data.splitType();
      this.chartTitle = new ChartTitle(this.el, type);
      this.chartTitle.render();

      // XAXIS OBJECT
      var xValues = this.data.xValues();
      var formatter = this.data.get('xAxisFormatter');
      var width = $('.x-axis-div').width();
      this.xAxis = new XAxis(this.el, xValues, formatter, width);
      this.xAxis.render();

      // YAXIS OBJECT
      var yMax = this.data.getYMaxValue();
      var height = $('.y-axis-div').height();
      this.yAxis = new YAxis(this.el, yMax, height);
      this.yAxis.render();

      // AXIS TITLE OBJECT
      var xTitle = this.data.get('xAxisLabel');
      var yTitle = this.data.get('yAxisLabel');
      this.axisTitle = new AxisTitle(this.el, xTitle, yTitle);
      this.axisTitle.render();

      // CHART OBJECT
      var vis = this;
      var charts = this.charts = [];

      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          var chart = new vis.ChartClass(vis, this, chartData);
          charts.push(chart);
          try {
            chart.render();
          } catch (error) {
            console.error(error.message);
          }
        });

      this.checkSize();
    };

    Vis.prototype.resize = function () {
      if (!this.data.data) {
        throw new Error('No valid data');
      }
      this.render(this.data.data);
    };

    Vis.prototype.checkSize = _.debounce(function () {
      // enable auto-resize
      var size = $('.chart').width() + ':' + $('.chart').height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(), 300);
    }, 300);

    Vis.prototype.on = function () {
      return this.chart.on();
    };

    Vis.prototype.off = function () {
      return this.chart.off();
    };

    Vis.prototype.destroy = function () {
      return this.chart.destroy();
    };

    Vis.prototype.set = function (name, val) {
      return this.chart.set(name, val);
    };

    Vis.prototype.get = function (name) {
      return this.chart.get(name);
    };

    return Vis;
  };
});