define(function (require) {
  return function PointSeriesChartProvider(d3, Private) {
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var Tooltip = Private(require('components/vislib/components/tooltip/tooltip'));
    var touchdownTmpl = _.template(require('text!components/vislib/partials/touchdown.tmpl.html'));

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
      var xAxis = this.handler.xAxis;
      var xScale = xAxis.xScale;
      var yScale = xAxis.yScale;
      var ordered = xAxis.ordered;

      if (!ordered || ordered.min == null || ordered.max == null) return;

      var attr = this.handler._attr;
      var height = attr.height;
      var width = attr.width;
      var margin = attr.margin;
      var color = '#004c99';

      // we don't want to draw endzones over our min and max values, they
      // are still a part of the dataset. We want to start the endzones just
      // outside of them so we will use these values rather than ordered.min/max
      var oneUnit = (ordered.units || _.identity)(1);
      var beyondMin = ordered.min - oneUnit;
      var beyondMax = ordered.max + oneUnit;

      // points on this axis represent the amount of time they cover,
      // so draw the endzones at the actual time bounds
      var leftEndzone = {
        x: 0,
        w: Math.max(xScale(ordered.min), 0)
      };

      var rightLastVal = xAxis.expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.xValues));
      var rightStart = rightLastVal + oneUnit;
      var rightEndzone = {
        x: xScale(rightStart),
        w: Math.max(width - xScale(rightStart), 0)
      };

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
      });

      function callPlay(event) {
        var boundData = event.target.__data__;
        var wholeBucket = boundData && boundData.x != null;

        var min = leftEndzone.w;
        var max = rightEndzone.x;

        // bounds of the cursor to consider
        var xLeft = event.offsetX;
        var xRight = event.offsetX;
        if (wholeBucket) {
          xLeft = xScale(boundData.x);
          xRight = xScale(xAxis.addInterval(boundData.x));
        }

        return {
          wholeBucket: wholeBucket,
          touchdown: min > xLeft || max < xRight
        };
      }

      function textFormatter() {
        return touchdownTmpl(callPlay(d3.event));
      }

      var endzoneTT = this.endzoneTT = new Tooltip('endzones', this.handler.el, textFormatter, null);
      endzoneTT.order = 0;
      endzoneTT.showCondition = function inEndzone() {
        return callPlay(d3.event).touchdown;
      };
      endzoneTT.render()(svg);
    };

    return PointSeriesChart;
  };
});