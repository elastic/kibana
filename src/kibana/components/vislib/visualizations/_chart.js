define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');

    var Legend = Private(require('components/vislib/lib/legend'));
    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var Tooltip = Private(require('components/vislib/lib/tooltip'));

    /*
     * Base Class for all visualizations.
     * Exposes a render method.
     */
    function Chart(handler, el, chartData) {
      if (!(this instanceof Chart)) {
        return new Chart(handler, el, chartData);
      }

      this.handler = handler;
      this.chartEl = el;
      this.chartData = chartData;
      var events = this.events = new Dispatch(handler, chartData);

      if (handler._attr.addTooltip) {
        var $el = this.handler.el;
        var formatter = this.handler.data.get('tooltipFormatter');
        // Add tooltip
        this.tooltip = new Tooltip($el, formatter, events);
      }

      this._attr = _.defaults(handler._attr || {}, {});
    }

    // Render the visualization.
    Chart.prototype.render = function () {
      return d3.select(this.chartEl).call(this.draw());
    };

    Chart.prototype.colorToClass = function (label) {
      return 'color ' + Legend.prototype.colorToClass.call(null, label);
    };

    return Chart;
  };
});