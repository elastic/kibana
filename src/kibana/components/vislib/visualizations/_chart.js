define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');

    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var Tooltip = Private(require('components/vislib/components/tooltip/tooltip'));
    var dataLabel = require('components/vislib/lib/_data_label');

    /**
     * The Base Class for all visualizations.
     *
     * @class Chart
     * @constructor
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    function Chart(handler, el, chartData) {
      if (!(this instanceof Chart)) {
        return new Chart(handler, el, chartData);
      }

      this.handler = handler;
      this.chartEl = el;
      this.chartData = chartData;

      var events = this.events = new Dispatch(handler);

      if (handler._attr.addTooltip) {
        var $el = this.handler.el;
        var formatter = this.handler.data.get('tooltipFormatter');

        // Add tooltip
        this.tooltip = new Tooltip('chart', $el, formatter, events);
      }

      this._attr = _.defaults(handler._attr || {}, {});
    }

    /**
     * Renders the chart(s)
     *
     * @method render
     * @returns {HTMLElement} Contains the D3 chart
     */
    Chart.prototype.render = function () {
      return d3.select(this.chartEl).call(this.draw());
    };

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param selection {Object} d3 select object
     */
    Chart.prototype._addIdentifier = function (selection, labelProp) {
      labelProp = labelProp || 'label';
      selection.each(function (datum) {
        var label = datum[0] ? datum[0][labelProp] : datum[labelProp];
        if (label == null) return;
        dataLabel(this, label);
      });
    };

    /**
     * Removes all DOM elements from the root element
     *
     * @method destroy
     */
    Chart.prototype.destroy = function () {
      d3.select(this.chartEl).selectAll('*').remove();
    };

    return Chart;
  };
});
