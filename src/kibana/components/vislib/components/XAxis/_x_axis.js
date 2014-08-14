define(function (require) {
  return function XAxisUtilService(d3) {
    var $ = require('jquery');

    return function (that) {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          var width = $(this).width();
          var height = $(this).height();

          var xScale = d3.scale.ordinal()
            .domain(that.xValues)
            .rangeBands([0, width], 0.1);

          var xAxis = d3.svg.axis()
            .scale(xScale)
            .tickFormat(that.xAxisFormatter)
            .orient('bottom');

          var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,0)')
            .call(xAxis);
        });
      };
    };
  };
});
