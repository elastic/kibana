define(function (require) {
  return function HandlerBaseClass(d3, Private) {
    var _ = require('lodash');

    var Data = Private(require('components/vislib/lib/data'));
    var Layout = Private(require('components/vislib/lib/layout/layout'));

    /*
     * Handles building all the components of the visualization
     * arguments:
     *  vis => this object from vis.js
     *
     *  returns an object with reference to the vis.prototype,
     *  and news up all the constructors needed to build a visualization
     */
    function Handler(vis, opts) {
      if (!(this instanceof Handler)) {
        return new Handler(vis, opts);
      }

      this.data = opts.data || new Data(vis.data, vis._attr);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
      });

      // Visualization constructors
      this.layout = new Layout(vis.el, vis.data, vis._attr.type);
      this.xAxis = opts.xAxis;
      this.yAxis = opts.yAxis;
      this.chartTitle = opts.chartTitle;
      this.axisTitle = opts.axisTitle;

      if (this._attr.addLegend && this.data.isLegendShown()) {
        this.legend = opts.legend;
      }

      // Array of objects to render to the visualization
      this.renderArray = _.filter([
        this.layout,
        this.legend,
        this.tooltip,
        this.axisTitle,
        this.chartTitle,
        this.xAxis,
        this.yAxis
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
