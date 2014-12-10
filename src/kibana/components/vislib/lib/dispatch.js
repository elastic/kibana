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
      var datum = d._input || d;
      var data = d3.event.target.nearestViewportElement.__data__;
      var label = d.label ? d.label : d.name;
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
        point: datum,
        datum: datum,
        label: label,
        color: color(label),
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

          if (typeof callback === 'function') {
            return element.on(event, callback);
          }
        });
      };
    };

    /**
     *
     * @method addHoverEvent
     * @returns {Function}
     */
    Dispatch.prototype.addHoverEvent = function () {
      var self = this;
      var isClickable = (this.dispatch.on('click'));
      var addEvent = this.addEvent;

      function hover(d, i) {
        d3.event.stopPropagation();

        // Add pointer if item is clickable
        if (isClickable) {
          self.addMousePointer.call(this, arguments);
        }

        self.dispatch.hover.call(this, self.eventResponse(d, i));
      }

      return addEvent('mouseover', hover);
    };

    /**
     *
     * @method addClickEvent
     * @returns {Function}
     */
    Dispatch.prototype.addClickEvent = function () {
      var self = this;
      var addEvent = this.addEvent;

      function click(d, i) {
        d3.event.stopPropagation();
        self.dispatch.click.call(this, self.eventResponse(d, i));
      }

      return addEvent('click', click);
    };

    /**
     * Determine if we will allow brushing
     *
     * @method allowBrushing
     * @returns {Boolean}
     */
    Dispatch.prototype.allowBrushing = function () {
      var xAxis = this.handler.xAxis;
      return Boolean(xAxis.ordered && xAxis.xScale && _.isFunction(xAxis.xScale.invert));
    };

    /**
     * Determine if brushing is currently enabled
     *
     * @method isBrushable
     * @returns {Boolean}
     */
    Dispatch.prototype.isBrushable = function () {
      return this.allowBrushing() && (typeof this.dispatch.on('brush') === 'function');
    };

    /**
     *
     * @param svg
     * @returns {Function}
     */
    Dispatch.prototype.addBrushEvent = function (svg) {
      if (!this.isBrushable()) return;
      var xScale = this.handler.xAxis.xScale;
      var brush = this.createBrush(xScale, svg);

      function brushEnd() {
        var bar = d3.select(this);
        var startX = d3.mouse(svg.node());
        var startXInv = xScale.invert(startX[0]);

        // Reset the brush value
        brush.extent([startXInv, startXInv]);

        // Magic!
        // Need to call brush on svg to see brush when brushing
        // while on top of bars.
        // Need to call brush on bar to allow the click event to be registered
        svg.call(brush);
        bar.call(brush);
      }

      return this.addEvent('mousedown', brushEnd);
    };


    /**
     * Mouse over Behavior
     *
     * @method addMousePointer
     * @returns {D3.Selection}
     */
    Dispatch.prototype.addMousePointer = function () {
      return d3.select(this).style('cursor', 'pointer');
    };

    /**
     * Adds D3 brush to SVG and returns the brush function
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
     */
    Dispatch.prototype.createBrush = function (xScale, svg) {
      var dispatch = this.dispatch;
      var attr = this.handler._attr;
      var height = attr.height;
      var margin = attr.margin;

      // Brush scale
      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushEnd() {

          // Assumes data is selected at the chart level
          // In this case, the number of data objects should always be 1
          var data = d3.select(this).data()[0];
          var isTimeSeries = (data.ordered && data.ordered.date);

          // Allows for brushing on d3.scale.ordinal()
          var selected = xScale.domain().filter(function (d) {
            return (brush.extent()[0] <= xScale(d)) && (xScale(d) <= brush.extent()[1]);
          });
          var range = isTimeSeries ? brush.extent() : selected;

          return dispatch.brush({
            range: range,
            config: attr,
            e: d3.event,
            data: data
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
