define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/lib/handler'));
    var Events = Private(require('factories/events'));
    var chartTypes = Private(require('components/vislib/vis_types'));

    /*
     * Visualization controller. Exposed API for creating visualizations.
     * arguments:
     *  $el => jquery reference to a DOM element
     *  config => object of params for the chart.
      *  e.g. type: 'column', addLegend: true, ...
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
    }

    // Exposed API for rendering charts.
    Vis.prototype.render = function (data) {
      if (!data) {
        throw new Error('No valid data!');
      }

      // Save data to this object and new up the Handler constructor
      this.data = data;
      this.handler = new Handler(this);

      try {
        this.handler.render();
      } catch (error) {
        // if involving height and width of the container, log error to screen
        if (error.message === 'The height and/or width of this container ' +
          'is too small for this chart.') {
          this.handler.error(error.message);
        } else {
          console.log(error);
          //throw(error);
        }
      }

      this.checkSize();
    };

    // Check for changes to the chart container height and width.
    Vis.prototype.checkSize = _.debounce(function () {
      if (arguments.length) { return; }

      // enable auto-resize
      var size = $(this.el).find('.chart').width() + ':' + $(this.el).find('.chart').height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(), 250);
    }, 250);

    // Resize the chart
    Vis.prototype.resize = function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      this.render(this.data);
    };

    // Destroy the chart
    Vis.prototype.destroy = function () {
      // Turn off checkSize
      this.checkSize(false);

      // Removing chart and all elements associated with it
      d3.select(this.el).selectAll('*').remove();

      // Cleaning up event listeners
      this.off('click', null);
      this.off('hover', null);
      this.off('brush', null);
    };

    // Set attributes on the chart
    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render(this.data);
    };

    // Get attributes from the chart
    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    return Vis;
  };
});