define(function (require) {
  return function PointSeriesChartProvider(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var Tooltip = Private(require('components/vislib/components/tooltip/tooltip'));
    var touchdownHtml = require('text!components/vislib/partials/touchdown.html');

    _(PointSeriesChart).inherits(Chart);
    function PointSeriesChart(handler, chartEl, chartData) {
      if (!(this instanceof PointSeriesChart)) {
        return new PointSeriesChart(handler, chartEl, chartData);
      }

      PointSeriesChart.Super.apply(this, arguments);
    }

    /**
     * Stacks chart data values
     *
     * @method stackData
     * @param data {Object} Elasticsearch query result for this chart
     * @returns {Array} Stacked data objects with x, y, and y0 values
     */
    PointSeriesChart.prototype.stackData = function (data) {
      var self = this;
      var stack = this._attr.stack;

      return stack(data.series.map(function (d) {
        var label = d.label;
        return d.values.map(function (e, i) {
          return {
            _input: e,
            label: label,
            x: self._attr.xValue.call(d.values, e, i),
            y: self._attr.yValue.call(d.values, e, i)
          };
        });
      }));
    };

    /**
     * Creates rects to show buckets outside of the ordered.min and max, returns rects
     *
     * @param xScale {Function} D3 xScale function
     * @param svg {HTMLElement} Reference to SVG
     * @method createEndZones
     * @returns {D3.Selection}
     */
    PointSeriesChart.prototype.createEndZones = function (svg) {
      var xScale = this.handler.xAxis.xScale;
      var yScale = this.handler.xAxis.yScale;
      var addEvent = this.addEvent;
      var attr = this.handler._attr;
      var height = attr.height;
      var width = attr.width;
      var margin = attr.margin;
      var ordered = this.handler.xAxis.ordered;
      var xVals = this.handler.xAxis.xValues;
      var color = '#004c99';

      if (!ordered || ordered.min == null || ordered.max == null) return;

      var leftEndzone = {
        x: 0,
        w: xScale(ordered.min) > 0 ? xScale(ordered.min) : 0
      };

      var rightEndzone = {
        x: xScale(ordered.max),
        w: width - xScale(ordered.max) > 0 ? width - xScale(ordered.max) : 0
      };

      // svg diagonal line pattern
      this.pattern = svg.append('defs')
      .append('pattern')
      .attr('id', 'DiagonalLines')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(45)')
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '4')
      .attr('height', '4')
      .append('rect')
      .attr('stroke', 'none')
      .attr('fill', color)
      .attr('width', 2)
      .attr('height', 4);

      this.endzones = svg.selectAll('.layer')
      .data([leftEndzone, rightEndzone])
      .enter()
      .insert('g', '.brush')
      .attr('class', 'endzone')
      .append('rect')
      .attr('class', 'zone')
      .attr('x', function (d) {
        return d.x;
      })
      .attr('y', 0)
      .attr('height', height - margin.top - margin.bottom)
      .attr('width', function (d) {
        return d.w;
      })
      .attr('fill', 'url(#DiagonalLines)');

      var touchdown = _.constant(touchdownHtml);
      var endzoneTT = this.endzoneTT = new Tooltip('endzones', this.handler.el, touchdown, null);
      endzoneTT.order = 0;
      endzoneTT.showCondition = function inEndzone() {
        var x = d3.event.offsetX;
        return (x < leftEndzone.w) || (x > rightEndzone.x);
      };
      endzoneTT.render()(svg);
    };

    return PointSeriesChart;
  };
});