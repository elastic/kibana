define(function (require) {
  return function ChartBaseClass(d3, Private) {
    var _ = require('lodash');
    var errors = require('errors');

    var Legend = Private(require('components/vislib/lib/legend'));
    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var Tooltip = Private(require('components/vislib/components/tooltip/tooltip'));

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
      try {
        d3.select(this.chartEl).call(this.draw());
      } catch (error) {
        if (error instanceof errors.PieContainsAllZeros ||
          error instanceof errors.NoResults) {

          this._error(error.message);
        } else {
          throw error;
        }
      }
    };

    /**
     * Displays an error message in the DOM
     */
    Chart.prototype._error = function (message) {
      var selection = d3.select(this.chartEl);

      // Remove all elements from selection
      selection.selectAll('*').remove();

      var div = selection
        .append('div')
        // class name needs `chart` in it for the polling checkSize function
        // to continuously call render on resize
        .attr('class', 'visualize-error chart error');

      if (message === 'No results found') {
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
     * Returns a CSS class name
     *
     * @method colorToClass
     * @param label {String} Data point label
     * @returns {String} CSS class name
     */
    Chart.prototype.colorToClass = function (label) {
      return Legend.prototype.colorToClass.call(null, label);
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
