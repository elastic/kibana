define(function (require) {
  return function VisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/modules/Handler'));
    var Events = Private(require('factories/events'));

    // VisLib Visualization Types
    var chartTypes = {
      histogram : Private(require('components/vislib/modules/ColumnChart'))
    };

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
      if (!data) {
        throw new Error('No valid data!');
      }

      this.data = data;
      this.handler = new Handler(this);

      try {
        this.handler.render();
      } catch (error) {
        console.error(error.message);
      }

      this.checkSize();
    };

    Vis.prototype.resize = function () {
      if (!this.data) {
        throw new Error('No valid data');
      }
      //this.render(this.data.data);
      this.render(this.data);
    };

    Vis.prototype.checkSize = _.debounce(function () {
      // enable auto-resize
      var size = $('.chart').width() + ':' + $('.chart').height();

      if (this.prevSize !== size) {
        this.resize();
      }
      this.prevSize = size;
      setTimeout(this.checkSize(), 250);
    }, 250);

    Vis.prototype.destroy = function () {
      this._attr.destroyFlag = true;

      // Removing chart and all elements associated with it
      d3.select(this.el).selectAll('*').remove();

      // Cleaning up event listeners
      this.off('click');
      this.off('hover');
      this.off('brush');
      d3.select(window)
        .on('resize', null);
    };

    Vis.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render();
    };

    Vis.prototype.get = function (name) {
      return this._attr[name];
    };

    return Vis;
  };
});