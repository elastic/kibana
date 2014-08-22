define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(XAxis).inherits(Chart);
    function XAxis(args) {
      XAxis.Super.apply(this, arguments);
      this.el = args.el;
      this.data = args.data;
      this._attr = args.attr;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
    };

    XAxis.prototype.getScale = function (ordered) {
      if (ordered && ordered.date) {
        return d3.time.scale();
      }
      return d3.scale.ordinal();
    };

    XAxis.prototype.getDomain = function (scale, ordered) {
      var xValues = this.data.xValues();

      if (ordered && ordered.date) {
        // Calculate the min date, max date, and time interval;
        return this.getTimeDomain(scale, xValues, ordered);
      }
      return this.getOrdinalDomain(scale, xValues);
    };

    XAxis.prototype.getTimeDomain = function (scale, xValues, ordered) {
      // Take the min of the xValues or the ordered object
      var minDate = Math.min(d3.min(xValues), ordered.min);
      // Take the max of the xValues or the ordered object
      var maxDate = Math.max(d3.max(xValues), ordered.max);
      var timeInterval = ordered.interval;

      // Should think about replacing
      var spacingPercentage = 0.25;
      scale.domain([minDate, maxDate + timeInterval * (1 - spacingPercentage)]);

      return scale;
    };

    XAxis.prototype.getOrdinalDomain = function (scale, xValues) {
      return scale.domain(xValues);
    };

    XAxis.prototype.getRange = function (scale, ordered, width) {
      if (ordered && ordered.date) {
        scale.range([0, width]);
        return scale;
      }
      scale.rangeBands([0, width], 0.1);
      return scale;
    };

    XAxis.prototype.getXScale = function (ordered, width) {
      var scale = this.getScale(ordered);
      var domain = this.getDomain(scale, ordered);
      var xScale = this.getRange(domain, ordered, width);

      return xScale;
    };

    XAxis.prototype.getXAxis = function (width) {
      var ordered = this.data.get('ordered');

      this.xAxisFormatter = this.data.get('xAxisFormatter');
      this.xScale = this.getXScale(ordered, width);

      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .tickFormat(this.xAxisFormatter)
        .orient('bottom');
    };

    XAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var svg;
      var bbox;
      var tickN;
      var ticksLength;
      var rotatedTicksLength;
      var percentage;

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width() - margin.left - margin.right;
          height = $(this).height();

          self.validateHeightAndWidth(div, width, height);

          // Return access to xAxis variable on the object
          self.getXAxis(width);

          svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(self.xAxis);

          // check widths to apply rotate
          bbox = selection.selectAll('.tick text').node().getBBox();
          tickN = selection.selectAll('.tick text')[0].length;
          ticksLength = bbox.width * 1.05 * tickN;
          if (ticksLength > width) {
            self.rotateAxisLabels(selection);
          }

          // check widths to apply filter
          rotatedTicksLength = bbox.height * 1.05 * tickN;
          percentage = Math.floor(rotatedTicksLength / width) + 1;
          if (rotatedTicksLength > width) {
            self.filterAxisLabels(selection, percentage);
          }
        });
      };
    };

    XAxis.prototype.rotateAxisLabels = function (selection) {
      return selection.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.60em')
        .attr('transform', function () {
          return 'rotate(-90)';
        });
    };

    XAxis.prototype.filterAxisLabels = function (selection, nth) {
      var self = this;
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? self.xAxisFormatter(d) : '';
        });
    };

    return XAxis;
  };
});
