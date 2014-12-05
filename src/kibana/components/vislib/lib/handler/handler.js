define(function (require) {
  return function HandlerBaseClass(d3, Private) {
    var _ = require('lodash');

    var Data = Private(require('components/vislib/lib/data'));
    var Layout = Private(require('components/vislib/lib/layout/layout'));

    /**
     * Handles building all the components of the visualization
     *
     * @class Handler
     * @constructor
     * @param vis {Object} Reference to the Vis Class Constructor
     * @param opts {Object} Reference to Visualization constructors needed to
     * create the visualization
     */
    function Handler(vis, opts) {
      if (!(this instanceof Handler)) {
        return new Handler(vis, opts);
      }

      this.data = opts.data || new Data(vis.data, vis._attr);
      this.vis = vis;
      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this.charts = [];

      this._attr = _.defaults(vis._attr || {}, {
        'margin' : { top: 10, right: 3, bottom: 5, left: 3 }
      });

      this.layout = new Layout(vis.el, vis.data, vis._attr.type);
      this.xAxis = opts.xAxis;
      this.yAxis = opts.yAxis;
      this.chartTitle = opts.chartTitle;
      this.axisTitle = opts.axisTitle;

      if (this._attr.addLegend && this.data.isLegendShown()) {
        this.legend = opts.legend;
      }

      this.renderArray = _.filter([
        this.layout,
        this.legend,
        this.axisTitle,
        this.chartTitle,
        this.xAxis,
        this.yAxis
      ], Boolean);
    }

    /**
     * Renders the constructors that create the visualization,
     * including the chart constructor
     *
     * @method render
     * @returns {HTMLElement} With the visualization child element
     */
    Handler.prototype.render = function () {
      var self = this;
      var charts = this.charts = [];

      this.renderArray.forEach(function (property) {
        if (typeof property.render === 'function') {
          property.render();
        }
      });

      // render the chart(s)
      d3.select(this.el)
      .selectAll('.chart')
      .each(function (chartData) {
        var chart = new self.ChartClass(self, this, chartData);
        var enabledEvents;

         /*
          * inside handler: if there are charts, bind events to charts
          * functionality: track in array that event is enabled
          * clean up event handlers every time it destroys the chart
          * rebind them every time it creates the charts
          */
        if (chart.events.dispatch) {
          enabledEvents = self.vis.eventTypes.enabled;

          // Copy dispatch.on methods to chart object
          d3.rebind(chart, chart.events.dispatch, 'on');

          // Bind events to chart(s)
          if (enabledEvents.length) {
            enabledEvents.forEach(function (event) {
              self.enable(event, chart);
            });
          }
        }

        charts.push(chart);
        chart.render();
      });
    };


    /**
     * Enables events, i.e. binds specific events to the chart
     * object(s) `on` method. For example, `click` or `mousedown` events.
     * Emits the event to the Events class.
     *
     * @method enable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    Handler.prototype.enable = function (event, chart) {
      return chart.on(event, function (e) {
        this.vis.emit(event, e);
      }.bind(this));
    };

    /**
     * Disables events by passing null to the event listener.
     * According to the D3 documentation for event handling:
     * https://github.com/mbostock/d3/wiki/Selections#on, to remove all
     * listeners for a particular event type, pass null as the listener.
     *
     * @method disable
     * @param event {String} Event type
     * @param chart {Object} Chart
     * @returns {*}
     */
    Handler.prototype.disable = function (event, chart) {
      return chart.on(event, null);
    };

    /**
     * Removes all DOM elements from the HTML element provided
     *
     * @method removeAll
     * @param el {HTMLElement} Reference to the HTML Element that
     * contains the chart
     * @returns {D3.Selection|D3.Transition.Transition} With the chart
     * child element removed
     */
    Handler.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    /**
     * Displays an error message in the DOM
     *
     * @method error
     * @param message {String} Error message to display
     * @returns {HTMLElement} Displays the input message
     */
    Handler.prototype.error = function (message) {
      this.removeAll(this.el);

      return d3.select(this.el)
      .append('div')
      // class name needs `chart` in it for the polling checkSize function
      // to continuously call render on resize
      .attr('class', 'visualize-error chart error')
      .append('h4')
      .text(message);
    };

    /**
     * Destroys all the charts in the visualization
     *
     * @method destroy
     */
    Handler.prototype.destroy = function () {
      this.charts.forEach(function (chart) {
        if (_.isFunction(chart.destroy)) {
          chart.destroy();
        }
      });

      this.charts.length = 0;
    };

    return Handler;
  };
});
