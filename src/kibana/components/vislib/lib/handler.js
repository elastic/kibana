define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  return function HandlerBaseClass(d3, Private) {
    var Data = Private(require('components/vislib/lib/data'));
    var Layout = Private(require('components/vislib/lib/layout'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var Tooltip = Private(require('components/vislib/lib/tooltip'));
    var XAxis = Private(require('components/vislib/lib/x_axis'));
    var YAxis = Private(require('components/vislib/lib/y_axis'));
    var AxisTitle = Private(require('components/vislib/lib/axis_title'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    function Handler(vis) {
      if (!(this instanceof Handler)) {
        return new Handler(vis);
      }

      this.data = new Data(vis.data);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 },
        destroyFlag: false
      });

      this.layout = new Layout(this.el, this.data.injectZeros(), this._attr.type);

      if (this._attr.addLegend) {
        this.legend = new Legend(this.el, this.data.getLabels(), this.data.getColorFunc(), this._attr);
      }

      if (this._attr.addTooltip) {
        this.tooltip = new Tooltip(this.el, this.data.get('tooltipFormatter'));
      }

      this.xAxis = new XAxis({
        el: this.el,
        xValues: this.data.xValues(),
        ordered: this.data.get('ordered'),
        xAxisFormatter: this.data.get('xAxisFormatter'),
        _attr: this._attr
      });

      this.yAxis = new YAxis({
        el: this.el,
        chartData: this.data.chartData(),
        dataArray: this.data.flatten(),
        _attr: this._attr
      });

      this.axisTitle = new AxisTitle(this.el, this.data.get('xAxisLabel'), this.data.get('yAxisLabel'));
      this.chartTitle = new ChartTitle(this.el);

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

    Handler.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    Handler.prototype.error = function (message) {
      // Removes the legend container
      this.removeAll(this.el);

      return d3.select(this.el)
        .append('div')
        .attr('class', 'error-wrapper')
        .append('div')
        .attr('class', 'chart error')
        .append('p')
        .style('line-height', function () {
          return $(this.el).height() + 'px';
        })
        .text(message);
    };

    return Handler;
  };
});
