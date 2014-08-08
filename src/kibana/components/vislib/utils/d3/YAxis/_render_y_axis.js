define(function (require) {
  return function RenderYAxisUtilService(d3, Private) {
    var renderYAxis = Private(require('components/vislib/utils/d3/XAxis/_x_axis'));
    var split = Private(require('components/vislib/utils/d3/XAxis/_split_y_axis'));

    return function (that) {
      // Creates the x axis divs for selection
      split(that);
      return d3.selectAll('.y-axis-div').call(renderYAxis(that));
    };
  };
});
