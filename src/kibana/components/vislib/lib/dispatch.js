define(function (require) {
  return function DispatchClass(d3) {
    var _ = require('lodash');

    /**
     * Handles event responses
     *
     * @class Dispatch
     * @constructor
     * @param handler {Object} Reference to Handler Class Object
     * @param chartData {Object} Elasticsearch data object
     */

    function Dispatch(handler, chartData) {
      if (!(this instanceof Dispatch)) {
        return new Dispatch(handler, chartData);
      }
      var type = handler._attr.type;

      this.handler = handler;
      this.chartData = chartData;
      
      // FIX THIS FOR TILE MAP
      // this.color = type === 'pie' ? handler.data.getPieColorFunc() : handler.data.getColorFunc();
      this._attr = _.defaults(handler._attr || {}, {
        yValue: function (d) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout')
      });
    }

    /**
     * Response to click and hover events
     *
     * @param d {Object} Data point
     * @param i {Number} Index number of data point
     * @returns {{value: *, point: *, label: *, color: *, pointIndex: *, series: *, config: *, data: (Object|*),
     * e: (d3.event|*), handler: (Object|*)}} Event response object
     */
    Dispatch.prototype.eventResponse = function (d, i) {
      console.log('eventResponse', d, i);
      var isPercentage = (this._attr.mode === 'percentage');
      var label = d.label;
      var getYValue = this._attr.yValue;
      // var color = this.color;
      var chartData = this.chartData;
      var attr = this._attr;
      var handler = this.handler;

      if (chartData.series) {
        // Find object with the actual d value and add it to the point object
        var object = _.find(chartData.series, { 'label': label });
        d.value = +object.values[i].y;

        if (isPercentage) {

          // Add the formatted percentage to the point object
          d.percent = (100 * d.y).toFixed(1) + '%';
        }
      }

      return {
        value: getYValue(d, i),
        point: d,
        label: label,
        // color: color(label),
        pointIndex: i,
        series: chartData.series,
        config: attr,
        data: chartData,
        e: d3.event,
        handler: handler
      };
    };

    /**
     * Response to click and hover events for pie charts
     *
     * @param d {Object} Data point
     * @param i {Number} Index number of data point
     * @returns {{value: (d.value|*), point: *, label: (d.name|*), color: *, pointIndex: *, children: *, parent: *,
      * appConfig: *, config: *, data: (Object|*), e: (d3.event|*), handler: (Object|*)}} Event response object
     */
    Dispatch.prototype.pieResponse = function (d, i) {
      var label = d.name;
      var color = this.color;
      var chartData = this.chartData;
      var attr = this._attr;
      var handler = this.handler;

      return {
        value: d.value,
        point: d,
        label: label,
        color: color(label),
        pointIndex: i,
        children: d.children ? d.children : undefined,
        parent: d.parent ? d.parent : undefined,
        appConfig: d.appConfig,
        config: attr,
        data: chartData,
        e: d3.event,
        handler: handler
      };
    };

    /**
     * Adds D3 brush to SVG and returns the brush function
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @returns {*} Returns a D3 brush function and a SVG with a brush group attached
     */
    Dispatch.prototype.addBrush = function (xScale, svg) {
      var dispatch = this._attr.dispatch;
      var attr = this._attr;
      var chartData = this.chartData;
      var isBrush = this._attr.addBrushing;
      var height = this._attr.height;
      var margin = this._attr.margin;

      // Brush scale
      var brush = d3.svg.brush()
        .x(xScale)
        .on('brushend', function brushEnd() {
          // response returned on brush
          return dispatch.brush({
            range: brush.extent(),
            config: attr,
            e: d3.event,
            data: chartData
          });
        });

      // if `addBrushing` is true, add brush canvas
      if (isBrush) {
        svg.append('g')
        .attr('class', 'brush')
        .call(brush)
        .selectAll('rect')
        .attr('height', height - margin.top - margin.bottom);
      }

      return brush;
    };

    return Dispatch;
  };
});
