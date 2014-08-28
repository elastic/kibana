define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  return function HandlerBaseClass(d3, Private) {
    var Data = Private(require('components/vislib/modules/Data'));
    var Layout = Private(require('components/vislib/modules/Layout'));
    var Legend = Private(require('components/vislib/modules/legend'));
    var Tooltip = Private(require('components/vislib/modules/tooltip'));
    var XAxis = Private(require('components/vislib/modules/Xaxis'));
    var YAxis = Private(require('components/vislib/modules/YAxis'));
    var AxisTitle = Private(require('components/vislib/modules/AxisTitle'));
    var ChartTitle = Private(require('components/vislib/modules/ChartTitle'));

    function Handler(vis) {
      if (!(this instanceof Handler)) {
        return new Handler(vis);
      }

      this.data = new Data(vis.data);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
      });
      this.layout = new Layout(this.el, this.data.injectZeros());

      if (this._attr.addLegend) {
        this.legend = new Legend(this.data.getLabels(), this.data.getColorFunc(), this._attr, this.el);
      }

      if (this._attr.addTooltip) {
        this.tooltip = new Tooltip(this.data.get('tooltipFormatter'));
      }

      this.chartTitle = new ChartTitle(this.el);
      this.xAxis = new XAxis({
        el: this.el,
        xValues: this.data.xValues(),
        ordered: this.data.get('ordered'),
        xAxisFormatter: this.data.get('xAxisFormatter'),
        _attr: this._attr
      });
      this.yAxis = new YAxis({
        el: this.el,
        yMax: this.data.getYMaxValue(),
        _attr: this._attr
      });
      this.axisTitle = new AxisTitle(this.el, this.data.get('xAxisLabel'), this.data.get('yAxisLabel'));
      this.renderArray = [
        this.layout,
        this.legend,
        this.tooltip,
        this.xAxis,
        this.yAxis,
        this.axisTitle,
        this.chartTitle
      ];
    }

    Handler.prototype.render = function () {
      var self = this;
      var charts = this.charts = [];

      _.forEach(this.renderArray, function (property) {
        if (typeof property.render === 'function') {
          property.render();
        }
      });

      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          var chart = new self.ChartClass(self, this, chartData);

          // Bind events to the chart
          d3.rebind(chart, chart._attr.dispatch, 'on');

          // Bubbles the events up to the Vis Class and Events Class
          chart.on('click', function (e) {
            self.vis.emit('click', e);
          });

          chart.on('hover', function (e) {
            self.vis.emit('hover', e);
          });

          chart.on('brush', function (e) {
            self.vis.emit('brush', e);
          });

          charts.push(chart);
          chart.render();
        });
    };

    Handler.prototype.error = function () {};

    return Handler;
  };
});
