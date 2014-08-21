define(function (require) {
  return function XAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    function XAxis(el, values, formatter, width, margin) {
      this.el = el;
      this.xValues = values;
      this.xAxisFormatter = formatter;
      this.margin = margin;
      this.width = width - margin.left - margin.right;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.appendSVG());
    };

    XAxis.prototype.getXScale = function () {
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
