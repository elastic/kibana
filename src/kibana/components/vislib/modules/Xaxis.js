define(function (require) {
  return function XAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    function XAxis(el, values, formatter, width, margin, data) {
      this.el = el;
      this.data = data;
      this.xValues = values;
      this.xAxisFormatter = formatter;
      this.margin = margin;
      this.width = width - margin.left - margin.right;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.appendSVG());
    };

    XAxis.prototype.getScale = function () {
      this.ordered = this.data.get('ordered');

      // Tests whether the xValues are dates
      if (this.ordered && this.ordered.date) {
        return d3.time.scale();
      }
      return d3.scale.ordinal();
    };

    XAxis.prototype.getDomain = function () {
      var scale = this.getScale();
      var keys = this.data.xValues();
      var minDate;
      var maxDate;
      var timeInterval;
      var spacingPercentage;

      if (this.ordered.date) {
        // Calculate the min date, max date, and time interval;
        minDate = Math.min(Math.min(keys), this.ordered.min);
        maxDate = Math.max(keys);
        timeInterval = this.ordered.interval;
        spacingPercentage = 0.25;

        return scale.domain([minDate, maxDate + timeInterval * (1 - spacingPercentage)]);
      }
      return scale.domain(keys);
    };

    XAxis.prototype.getRange = function () {
      var scale = this.getDomain();
      if (this.ordered) {
        return scale.range([0, this.width]);
      }
      return scale.range([0, this.width], 0.1);
    };

    XAxis.prototype.getXScale = function () {
//      this.xScale = this.getRange();
      this.xScale = d3.scale.ordinal()
        .domain(this.xValues)
        .rangeBands([0, this.width], 0.1);
    };

    XAxis.prototype.getXAxis = function () {
      this.getXScale();

      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .tickFormat(this.xAxisFormatter)
        .orient('bottom');
    };

    XAxis.prototype.appendSVG = function () {
      var self = this;
      var div;
      var width;
      var height;
      var svg;
      var bbox;
      var tickN;
      var ticksLength;
      var rotatedTicksLength;
      var percentage;

      this.getXAxis();

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width() - self.margin.left - self.margin.right;
          height = $(this).height();

          svg = div.append('svg')
            .attr('width', width + self.margin.left + self.margin.right)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + self.margin.left + ',0)')
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
