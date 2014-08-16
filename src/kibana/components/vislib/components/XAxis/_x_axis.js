define(function (require) {
  return function XAxisUtilService(d3) {
    var $ = require('jquery');

    return function (self) {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          var width = $(this).width() - 10;
          var height = $(this).height();

          var xScale = d3.scale.ordinal()
            .domain(self.xValues)
            .rangeBands([0, width], 0.1);

          var xAxis = d3.svg.axis()
            .scale(xScale)
            .tickFormat(self.xAxisFormatter)
//            .tickValues(xScale.domain().filter(function(d, i) { return !(i % 5); }))
            .orient('bottom');

          var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(5,0)')
            .call(xAxis);

          self.rotateAxisLabels(selection);
        });
      };
    };
  };
});
