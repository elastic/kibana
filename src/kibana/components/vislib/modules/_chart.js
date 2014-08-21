define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Events = Private(require('factories/events'));

    _(Chart).inherits(Events);
    function Chart(vis, el, chartData) {
      Chart.Super.apply(this, arguments);
      this.vis = vis;
      this.chartEl = el;
      this.chartData = chartData;
      this._attr = _.defaults(vis.config || {}, {});
    }

    Chart.prototype.render = function () {
      return d3.select(this.chartEl).call(this.draw());
    };

//    Chart.prototype.on = function () {
//      var args = Array.prototype.slice.call(arguments);
//      var eventName = args[0];
//      var self = this;
//
//      // This should only be called the first time to wire up the D3 event handler
//      if (!this._listeners[eventName]) {
//        this._attr.dispatch.on.call(this._attr.dispatch, eventName, function () {
//          var eventArgs = Array.prototype.slice.call(arguments);
//          self.emit.apply(eventName, eventArgs);
//        });
//      }
//      Chart.Super.prototype.on.apply(this, args);
//    };

    Chart.prototype.off = function (event) {
      this.dispatch.on(event, null);
    };

    Chart.prototype.destroy = function () {};

    Chart.prototype.set = function (name, val) {
      this._attr[name] = val;
      this.render();
    };

    Chart.prototype.get = function (name) {
      return this._attr[name];
    };

    return Chart;
  };
});