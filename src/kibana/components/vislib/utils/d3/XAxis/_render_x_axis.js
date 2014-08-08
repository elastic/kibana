define(function (require) {
  return function RenderXAxisUtilService(d3, Private) {
    var renderXAxis = Private(require('components/vislib/utils/d3/XAxis/_x_axis'));
    var split = Private(require('components/vislib/utils/d3/XAxis/_split_x_axis'));

    return function (that) {
      // Creates the x axis divs for selection
      split(that.data);
      return d3.select('.x-axis-div').call(renderXAxis(that.xAxis));
    };
  };
});
