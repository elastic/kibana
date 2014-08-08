define(function (require) {
  return function YAxisUtilService(d3, Private) {
    var split = Private(require('components/vislib/utils/d3/XAxis/_split_y_axis'));

    return function (that) {
      split(that.data);

      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          var svg = div.append('svg')
            .attr('width', '100%')
            .attr('height', '100%');

          svg.append('g')
            .attr('class', 'y axis')
            .call(that.yAxis);
        });
      };
    };
  };
});
