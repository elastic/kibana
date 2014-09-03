define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/lib/handler'));
    var Events = Private(require('factories/events'));
    var chartTypes = Private(require('components/vislib/vis_types'));

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

    Vis.prototype.render = function (data) {
      if (this._attr.destroyFlag) {
        throw new Error('You tried to render a chart that was destroyed');
      }

      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = data;
      this.handler = new Handler(this);

      try {
        this.handler.render();
      } catch (error) {
        if (error.message === 'The height and/or width of this container ' +
          'is too small for this chart.') {
          this.handler.error(error.message);
        } else {
          console.log(error);
        }
      }

      this.checkSize();
    };

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

    Vis.prototype.resize = function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      this.render(this.data);
    };

    Vis.prototype.destroy = function () {
      this._attr.destroyFlag = true;
      this.checkSize(false);

      // Removing chart and all elements associated with it
      d3.select(this.el).selectAll('*').remove();

      // Cleaning up event listeners
      this.off('click', null);
      this.off('hover', null);
      this.off('brush', null);
    };

    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render(this.data);
    };

    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    return Vis;
  };
});