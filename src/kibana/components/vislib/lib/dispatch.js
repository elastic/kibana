define(function (require) {
  return function DispatchClass(d3) {
    var _ = require('lodash');

    /**
     * Handles event responses
     *
     * @class Dispatch
     * @constructor
     * @param handler {Object} Reference to Handler Class Object
     */

    function Dispatch(handler) {
      if (!(this instanceof Dispatch)) {
        return new Dispatch(handler);
      }

      this.handler = handler;
      this.dispatch = d3.dispatch('brush', 'click', 'hover', 'mouseup',
        'mousedown', 'mouseover');
    }

    /**
     * Response to click and hover events
     *
     * @param d {Object} Data point
     * @param i {Number} Index number of data point
     * @returns {{value: *, point: *, label: *, color: *, pointIndex: *,
      * series: *, config: *, data: (Object|*),
     * e: (d3.event|*), handler: (Object|*)}} Event response object
     */
    Dispatch.prototype.eventResponse = function (d, i) {
      var data = d3.event.target.nearestViewportElement.__data__;
      var isSeries = !!(data.series);
      var isSlices = !!(data.slices);
      var series = isSeries ? data.series : undefined;
      var slices = isSlices ? data.slices : undefined;
      var handler = this.handler;
      var color = handler.data.color;
      var isPercentage = (handler._attr.mode === 'percentage');

      if (isSeries) {

        // Find object with the actual d value and add it to the point object
        var object = _.find(series, { 'label': d.label });
        d.value = +object.values[i].y;

        if (isPercentage) {

          // Add the formatted percentage to the point object
          d.percent = (100 * d.y).toFixed(1) + '%';
        }
      }

      return {
        value: d.y,
        point: d,
        label: d.label,
        color: color(d.label),
        pointIndex: i,
        series: series,
        slices: slices,
        config: handler._attr,
        data: data,
        e: d3.event,
        handler: handler
      };
    };

    /**
     * Returns a function that adds events and listeners to a D3 selection
     *
     * @method addEvent
     * @param event {String}
     * @param callback {Function}
     * @returns {Function}
     */
    Dispatch.prototype.addEvent = function (event, callback) {
      return function (selection) {
        selection.each(function () {
          var element = d3.select(this);

          element.on(event, callback);
        });
      };
    };

    /**
     * Mouse over Behavior
     *
     * @method mouseOverBar
     * @returns {D3.Selection} this object with '.hover' class true
     */
    Dispatch.prototype.onMouseOver = function () {
      return d3.select(this).classed('hover', true)
        .style('stroke', '#333')
        .style('cursor', 'pointer');
    };

    /**
     * Mouse out Behavior
     *
     * @method mouseOutBar
     * @returns {D3.Selection} this object with '.hover' class false
     */
    Dispatch.prototype.onMouseOut = function () {
      return d3.select(this).classed('hover', false).style('stroke', null);
    };

    /**
     * Adds D3 brush to SVG and returns the brush function
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
     */
    Dispatch.prototype.addBrush = function (xScale, svg) {
      var dispatch = this.dispatch;
      var attr = this.handler._attr;
      var height = attr.height;
      var margin = attr.margin;

      // Brush scale
      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushEnd() {
          return dispatch.brush({
            range: brush.extent(),
            config: attr,
            e: d3.event,
            data: d3.event.sourceEvent.target.__data__
          });
        });

      // if `addBrushing` is true, add brush canvas
      if (dispatch.on('brush')) {
        svg.insert('g', 'g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
          .attr('height', height - margin.top - margin.bottom);

        return brush;
      }
    };

    return Dispatch;
  };
});
