define(function (require) {
  return function HistogramChartFactory(d3, Private) {

    var _ = require('lodash');

    var ChartFunctions = Private(require('components/vislib/modules/_functions'));
    var Events = Private(require('factories/events'));

    _(Chart).inherits(Events);
    function Chart(vis, el, chartData) {
      Chart.Super.call(this);

      this.el = vis.el;
      this.ChartClass = vis.ChartClass;
      this.data = vis.data;
      this.color = vis.color;
      this.orderedKeys = vis.orderedKeys;
      this.tooltip = vis.tooltip;

      // Chart specific items
      this.chartEl = el;
      this.chartData = chartData;
      this._attr = _.defaults(vis.config || {}, {});

    }

    _(Chart.prototype).extends(ChartFunctions.prototype);
    Chart.prototype.on = function () {
      var args = Array.prototype.slice.call(arguments);
      var eventName = args[0];
      var self = this;
      
      // This should be called the first time to wire up the D3 event handler
      if (!this._listners[eventName]) {
        this.d3.dispatch.on.call(this.d3.dispatch, eventName, function () {
          var eventArgs = Array.prototype.slice.call(arguments);
          self.emit.apply(eventName, eventArgs);
        });
      }

      Chart.Super.prototype.on.apply(this, args);
    };

    /*

    histogram.on('click', someFunction);
    histogram.on('click', someOtherFunction);

    Vis.prototype.on = function () {
      return this.chart.on.apply(this.chart, arguments);
    };

    Vis.prototype.off = function () {
      return this.chart.off.apply(this.chart, arguments);
    };
    
    */

  };
});