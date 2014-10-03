define(function (require) {
  return function DispatchClass(d3, Private) {
    var _ = require('lodash');

    /**
     * Events Class
     */
    function Dispatch(handler, chartData) {
      if (!(this instanceof Dispatch)) {
        return new Dispatch(handler, chartData);
      }
      var type = handler._attr.type;

      this.handler = handler;
      this.chartData = chartData;
      this.color = type === 'pie' ? handler.data.getPieColorFunc() : handler.data.getColorFunc();
      this._attr = _.defaults(handler._attr || {}, {
        yValue: function (d) {
          return d.y;
        },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout')
      });
    }

    // Response to `click` and `hover` events
    Dispatch.prototype.eventResponse = function (d, i) {
      var label = d.label;
      var getYValue = this._attr.yValue;
      var color = this.color;
      var chartData = this.chartData;
      var attr = this._attr;
      var handler = this.handler;

      return {
        value: getYValue(d, i),
        point: d,
        label: label,
        color: color(label),
        pointIndex: i,
        series: chartData.series,
        config: attr,
        data: chartData,
        e: d3.event,
        handler: handler
      };
    };

    // Pie response to `click` and `hover` events
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

    // Add brush to the svg
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
