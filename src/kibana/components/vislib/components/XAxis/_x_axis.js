define(function (require) {
  return function XAxisUtilService(d3) {
    var $ = require('jquery');

    return function (self) {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          var width = $(this).width();
          var height = $(this).height();

          var xScale = d3.scale.ordinal()
            .domain(self.xValues)
            .rangeBands([0, width - 10], 0.1);

          var xAxis = d3.svg.axis()
            .scale(xScale)
            .tickFormat(self.xAxisFormatter)
            .orient('bottom');

          var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(5,0)')
            .call(xAxis);

          // check widths to apply rotate
          var bbox = selection.selectAll('.tick text').node().getBBox();
          var tickN = selection.selectAll('.tick text')[0].length;
          var lbls = selection.selectAll('.tick text')[0];
          var maxW = width / tickN;
          for (var i = 0; i < tickN; i++) {
            if (lbls[i].clientWidth > maxW) {
              self.rotateAxisLabels(selection);
              break;
            }
          }

          // check widths to apply filter
          var rotatedTicksLength = bbox.height * 1.05 * tickN;
          var testpct = Math.floor(rotatedTicksLength / width) + 1;
          if (rotatedTicksLength > width) {
            self.filterAxisLabels(selection, testpct);
          }

        });
      };
    };
  };
});
