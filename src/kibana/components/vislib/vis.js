define(function (require) {
  return function VisFactory(d3, Private) {
    var _ = require('lodash');

    var ResizeChecker = Private(require('components/vislib/lib/resize_checker'));
    var Events = Private(require('factories/events'));
    var handlerTypes = Private(require('components/vislib/lib/handler/handler_types'));
    var chartTypes = Private(require('components/vislib/visualizations/vis_types'));
    var errors = require('errors');
    require('css!components/vislib/styles/main.css');

    /**
     * Creates the visualizations.
     *
     * @class Vis
     * @constructor
     * @param $el {HTMLElement} jQuery selected HTML element
     * @param config {Object} Parameters that define the chart type and chart options
     */
    _(Vis).inherits(Events);
    function Vis($el, config) {
      if (!(this instanceof Vis)) {
        return new Vis($el, config);
      }
      Vis.Super.apply(this, arguments);

      this.el = $el.get ? $el.get(0) : $el;
      this.ChartClass = chartTypes[config.type];
      this._attr = _.defaults(config || {}, {});

      // bind the resize function so it can be used as an event handler
      this.resize = _.bind(this.resize, this);

      this.resizeChecker = new ResizeChecker(this.el);
      this.resizeChecker.on('resize', this.resize);
    }

    /**
     * Renders the visualization
     *
     * @method render
     * @param data {Object} Elasticsearch query results
     */
    Vis.prototype.render = function (data) {
      var chartType = this._attr.type;

      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = data;
      this.handler = handlerTypes[chartType](this) || handlerTypes.column(this);

      try {
        this.handler.render();
      } catch (error) {
        // If involving height and width of the container, log error to screen.
        // Because we have to wait for the DOM element to initialize, we do not
        // want to throw an error when the DOM `el` is zero
        if (error instanceof errors.ContainerTooSmall) {
          this.handler.error(error.message);
        } else {
          console.error(error.stack);
        }
      }
    };

    /**
     * Resizes the visualization
     *
     * @method resize
     */
    Vis.prototype.resize = function () {
      if (!this.data) {
        // TODO: need to come up with a solution for resizing when no data is available
        return;
      }
      this.render(this.data);
    };

    /**
     * Destroys the visualization
     * Removes chart and all elements associated with it.
     * Remove event listeners and pass destroy call down to owned objects.
     *
     * @method destroy
     */
    Vis.prototype.destroy = function () {
      d3.select(this.el).selectAll('*').remove();
      this.resizeChecker.off('resize', this.resize);
      this.resizeChecker.destroy();
    };

    /**
     * Sets attributes on the visualization
     *
     * @method set
     * @param name {String} An attribute name
     * @param val {*} Value to which the attribute name is set
     */
    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render(this.data);
    };

    /**
     * Gets attributes from the visualization
     *
     * @method get
     * @param name {String} An attribute name
     * @returns {*} The value of the attribute name
     */
    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    /**
     * Turns on event listeners.
     *
     * @param event {String}
     * @param handler {Function}
     * @returns {*}
     */
    Vis.prototype.on = function (event, handler) {

      // Adds handler to _listeners[listener] array
      var ret = Events.prototype.on.call(this, event, handler);
      var handlerIndex;

      // Check if the charts array is available
      // if handler count changed from 0 to 1, call handler object
      // this.handler.enable(event)

      // inside handler: if there are charts, bind events to charts
      // functionality: track in array that event is enabled
      // clean up event handlers every time it destroys the chart
      // rebind them everytime it creates the charts

//      if (this.handler && this.handler.charts) {
//        handlerIndex = this._listeners[event].length - 1;
//
//        // Dispatch listener to chart
//        this.handler.charts.forEach(function (chart) {
//          chart.on(event + '.' + handlerIndex, function (e) {
//            handler.call(this, e);
//          });
//        });
//      }

      return ret;
    };

    /**
     * Turns off event listeners. Passes the null value as the handler to
     * event listeners.
     *
     * @param event {String}
     * @param handler {Function}
     * @returns {*}
     */
    Vis.prototype.off = function (event, handler) {
      var ret = Events.prototype.off.call(this, event, handler);
      var handlerIndex;

      if (this._listeners[event] && this.handler.charts) {

        // Once the handler array reaches zero, then set event to null

        // if no handler, set all listener handlers to null
        if (!handler) {
          this.handler.charts.forEach(function (chart) {
            chart.on(event, null);
          });
        } else {

          // if handler, turn off a specific handler
          handlerIndex = _.findIndex(this._listeners[event], {'handler': handler});

          this.handler.charts.forEach(function (chart) {
            chart.on(event + '.' + handlerIndex, null);
          });
        }
      }

      return ret;
    };

    return Vis;
  };
});