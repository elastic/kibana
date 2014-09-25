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
    function Chart(vis, el, chartData) {
      if (!(this instanceof Chart)) {
        return new Chart(vis, el, chartData);
      }

      this.vis = vis;
      this.chartEl = el;
      this.chartData = chartData;
      this.events = new Dispatch(vis, chartData);

      if (vis._attr.addTooltip) {
        // Add tooltip
        this.tooltip = new Tooltip(vis, this.events);
      }

      this._attr = _.defaults(vis._attr || {}, {});
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