define(function () {
  return function XAxisUtilService(d3) {
    return function (that) {
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

//          var xAxis = div.append('div')
//            .attr('class', 'x-axis-div');

          var svg = div.append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,0)')
            .call(that.xAxis);
        });
      };
    };
  };
});
