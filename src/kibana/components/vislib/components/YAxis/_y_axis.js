define(function (require) {
  return function YAxisUtilService(d3) {
    var $ = require('jquery');

    return function (that) {
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          var width = $(this).width();
          var height = $(this).height() - 5;

          var yScale = d3.scale.linear()
            .domain([0, that.yMax])
            .range([height, 0]);

          var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left');

          var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + 10);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + width + ',5)')
            .call(yAxis);
        });
      };
    };
  };
});
