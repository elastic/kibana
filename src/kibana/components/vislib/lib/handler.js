define(function (require) {
  var _ = require('lodash');

  return function HandlerBaseClass(d3, Private) {
    var Data = Private(require('components/vislib/lib/data'));
    var Layout = Private(require('components/vislib/lib/layout'));
    var Legend = Private(require('components/vislib/lib/legend'));
    var Tooltip = Private(require('components/vislib/lib/tooltip'));
    var XAxis = Private(require('components/vislib/lib/x_axis'));
    var YAxis = Private(require('components/vislib/lib/y_axis'));
    var AxisTitle = Private(require('components/vislib/lib/axis_title'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

    /*
     * Handles building all the components of the visualization
     * arguments:
     *  vis => this object from vis.js
     *
     *  returns an object with reference to the vis.prototype,
     *  and news up all the constructors needed to build a visualization
     */
    function Handler(vis) {
      if (!(this instanceof Handler)) {
        return new Handler(vis);
      }

      this.data = new Data(vis.data, vis._attr);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
      });

      // Visualization constructors
      var axesVisTypes = this.axesVisTypes = {
        ColumnChart: 'histogram',
        LineChart: 'line'
      };

      // Add the visualization layout
      if (axesVisTypes[this.ChartClass.name]) {
        this.layout = new Layout(this.el, this.data.injectZeros(), this._attr.type);
      } else {
        this.layout = new Layout(this.el, this.data.root(), this._attr.type);
      }

      // Only add legend if addLegend attribute set
      if (this._attr.addLegend) {
        if (this.ChartClass.name in axesVisTypes) {
          this.legend = new Legend(this.vis, this.el, this.data.getLabels(), this.data.getColorFunc(), this._attr);
        } else {
          this.legend = new Legend(this.vis, this.el, this.data.getLabelsAndXValues(), this.data.getPieColorFunc(), this._attr);
        }
      }

      // only add tooltip if addTooltip attribute set
      if (this._attr.addTooltip) {
        this.tooltip = new Tooltip(this.el, this.data.get('tooltipFormatter'));
      }

      // add a x axis
      if (axesVisTypes[this.ChartClass.name]) {
        this.xAxis = new XAxis({
          el: this.el,
          xValues: this.data.xValues(),
          ordered: this.data.get('ordered'),
          xAxisFormatter: this.data.get('xAxisFormatter'),
          _attr: this._attr
        });

        // add a y axis
        this.yAxis = new YAxis({
          el: this.el,
          yMax: this.data.getYMaxValue(),
          _attr: this._attr
        });

        // add axis titles
        this.axisTitle = new AxisTitle(this.el, this.data.get('xAxisLabel'), this.data.get('yAxisLabel'));
      }

      // add chart titles
      this.chartTitle = new ChartTitle(this.el);

      // Array of objects to render to the visualization
      this.renderArray = _.filter([
        this.layout,
        this.legend,
        this.tooltip,
        this.axisTitle,
        this.chartTitle,
        this.yAxis,
        this.xAxis
      ], Boolean);
    }

    // Render the visualization
    Handler.prototype.render = function () {
      var self = this;
      // Save a reference to the charts
      var charts = this.charts = [];

      // Render objects in the render array
      _.forEach(this.renderArray, function (property) {
        if (typeof property.render === 'function') {
          property.render();
        }
      });

      // Add charts to the visualization
      d3.select(this.el)
        .selectAll('.chart')
        .each(function (chartData) {
          // new up the visualization type
          var chart = new self.ChartClass(self, this, chartData);

          // Bind events to the chart
          d3.rebind(chart, chart._attr.dispatch, 'on');

          // Bubble events up to the Vis Class and Events Class
          chart.on('click', function (e) {
            self.vis.emit('click', e);
          });

          chart.on('hover', function (e) {
            self.vis.emit('hover', e);
          });

          chart.on('brush', function (e) {
            self.vis.emit('brush', e);
          });

          // Save reference to charts
          charts.push(chart);

          // Render charts to screen
          chart.render();
        });
    };

    // Remove all DOM elements from the `el` provided
    Handler.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    // Display an error message on the screen
    Handler.prototype.error = function (message) {
      this.removeAll(this.el);

      // Return an error wrapper DOM element
      return d3.select(this.el).append('div')
        // class name needs `chart` in it for the polling checkSize function
        // to continuously call render on resize
        .attr('class', 'chart error')
        .append('p')
        .text(message);
    };

    return Handler;
  };
});
