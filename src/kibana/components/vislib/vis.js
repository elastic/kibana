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
      this.eventTypes = {
        enabled: []
      };

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
      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = data;
      this._instantiateHandler();
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

      if (this.handler && _.isFunction(this.handler.resize)) {
        this._runOnHandler('resize');
      } else {
        this.render(this.data);
      }
    };

    /**
     * Handles errors that are bubbled up from the Handler constructor.
     *
     * @param error
     * @returns {HTMLElement}
     * @private
     */
    Vis.prototype._errorHandler = function (error) {
      // If involving height and width of the container, log error to screen.
      // Because we have to wait for the DOM element to initialize, we do not
      // want to throw an error when the DOM `el` is zero
      if (error instanceof errors.NotEnoughData ||
        error instanceof errors.NoResults ||
        error instanceof errors.NoResultsWithinTimeRange) {
        return this.error(error.message);
      } else {
        throw error;
      }
    };

    /**
     * Calls methods on the Handler.
     *
     * @param method {String} Handler method
     * @returns {*}
     * @private
     */
    Vis.prototype._runOnHandler = function (method) {
      try {
        this.handler[method]();
      } catch (error) {
        return this._errorHandler(error);
      }
    };

    /**
     * Instantiates the Handler
     *
     * @returns {HTMLElement}
     * @private
     */
    Vis.prototype._instantiateHandler = function () {
      var chartType = this._attr.type;

      try {
        this.handler = handlerTypes[chartType](this) || handlerTypes.column(this);
      } catch (error) {
        return this._errorHandler(error);
      }

      this._runOnHandler('render');
    };

    /**
     * Removes all DOM elements from the HTML element provided
     *
     * @method removeAll
     * @param el {HTMLElement} Reference to the HTML Element that
     * contains the chart
     * @returns {D3.Selection} With the chart
     * child element removed
     */
    Vis.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    /**
     * Displays an error message in the DOM
     *
     * @method error
     * @param message {String} Error message to display
     * @returns {HTMLElement} Displays the input message
     */
    Vis.prototype.error = function (message) {
      this.removeAll(this.el);

      var div = d3.select(this.el)
        .append('div')
        // class name needs `chart` in it for the polling checkSize function
        // to continuously call render on resize
        .attr('class', 'visualize-error chart error');

      if (message === 'No results found' ||
        message === 'No results were found within the time range selected') {

        div.append('div')
          .attr('class', 'text-center visualize-error visualize-chart ng-scope')
          .append('div').attr('class', 'item top')
          .append('div').attr('class', 'item')
          .append('h2').html('<i class="fa fa-meh-o"></i>')
          .append('h4').text(message);

        div.append('div').attr('class', 'item bottom');
        return div;
      }

      return div.append('h4').text(message);
    };

    /**
     * Destroys the visualization
     * Removes chart and all elements associated with it.
     * Removes chart and all elements associated with it.
     * Remove event listeners and pass destroy call down to owned objects.
     *
     * @method destroy
     */
    Vis.prototype.destroy = function () {
      this.resizeChecker.off('resize', this.resize);
      this.resizeChecker.destroy();
      if (this.handler) this._runOnHandler('destroy');
      d3.select(this.el).selectAll('*').remove();
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
     * @param listener{Function}
     * @returns {*}
     */
    Vis.prototype.on = function (event, listener) {
      var ret = Events.prototype.on.call(this, event, listener); // Adds event to _listeners array
      var listeners = this._listeners[event].length;
      var charts = (this.handler && this.handler.charts);
      var chartCount = charts ? charts.length : 0;
      var enabledEvents = this.eventTypes.enabled;
      var eventAbsent = (enabledEvents.indexOf(event) === -1);

      // if this is the first listener added for the event
      // and charts are available, bind the event to the chart(s)
      // `on` method
      if (listeners === 1 && chartCount > 0) {
        charts.forEach(function (chart) {
          this.handler.enable(event, chart);
        }, this);
      }

      // Keep track of enabled events
      if (eventAbsent) {
        enabledEvents.push(event);
      }

      return ret;
    };

    /**
     * Turns off event listeners.
     *
     * @param event {String}
     * @param listener{Function}
     * @returns {*}
     */
    Vis.prototype.off = function (event, listener) {
      var ret = Events.prototype.off.call(this, event, listener);  // Removes event from _listeners array
      var listeners = (!!this._listeners[event] && this._listeners[event].length !== 0);
      var charts = (this.handler && this.handler.charts);
      var chartCount = charts ? charts.length : 0;
      var eventIndex = this.eventTypes.enabled.indexOf(event);
      var eventPresent = (eventIndex !== -1);

      // Once the listener array reaches zero, turn off event
      if (!listeners && eventPresent) {
        if (chartCount > 0) {
          charts.forEach(function (chart) {
            this.handler.disable(event, chart);
          }, this);
        }

        // Remove event from enabled array
        this.eventTypes.enabled.splice(eventIndex, 1);
      }

      return ret;
    };

    return Vis;
  };
});
