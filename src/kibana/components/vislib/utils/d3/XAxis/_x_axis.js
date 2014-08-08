define(function (require) {
  return function XAxisUtilService(d3, Private) {
    var split = Private(require('components/vislib/utils/d3/XAxis/_split_x_axis'));

    return function (that) {
      split(that.data);

      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          var xAxis = div.append('div')
            .attr('class', 'x-axis-div');

          var svg = xAxis.append('svg')
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
