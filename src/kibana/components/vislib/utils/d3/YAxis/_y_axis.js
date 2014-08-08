define(function () {
  return function YAxisUtilService(d3) {
    return function (that) {
      var yAxis = that.yAxis;

      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          var svg = div.append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

          svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
        });
      };
    };
  };
});
