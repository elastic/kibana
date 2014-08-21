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
      var isRotated = false;
      var ratio;
      var oClass;
      var iClass;
      var spacerht;
      var isDiscover = false;
      
      if ($('.discover-timechart').length) isDiscover = true;

      this.getXAxis();

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width() - self.margin.left - self.margin.right;
          height = $(this).height();

          svg = div.append('svg')
            .attr('width', width + self.margin.left + self.margin.right)
            .attr('height', height);

          var xaxis = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + self.margin.left + ',0)')
            .call(self.xAxis);

          bbox = selection.selectAll('.tick text').node().getBBox();
          tickN = selection.selectAll('.tick text')[0].length;
          ticksLength = bbox.width * 1.05 * tickN;
          rotatedTicksLength = bbox.width * 1.05 * tickN;
          
          if (!isDiscover) {
            rotatedTicksLength = bbox.height * 1.05 * tickN;
            // check widths to apply rotate
            if (ticksLength > width) {
              self.rotateAxisLabels(selection);
              isRotated = true;
            }
          }

          // check widths to apply filter
          percentage = Math.floor(rotatedTicksLength / width) + 1;
          if (rotatedTicksLength > width) {
            self.filterAxisLabels(selection, percentage);
          }

          // set heights of x-axis-div and x-axis-div-wrapper to fit ticklabels
          var newheight = xaxis.node().getBBox();
          $('.x-axis-div').height(newheight.height);
          $('.x-axis-div-wrapper').height(newheight.height);
          svg.attr('height', newheight.height);

          $('.x-axis-wrapper').height(newheight.height + 20);
          $('.y-axis-spacer-block').height(newheight.height + 20);

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
