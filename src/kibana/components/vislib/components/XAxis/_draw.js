define(function (require) {
  return function ColumnDrawUtilService(d3, Private) {
    var renderXAxis = Private(require('components/vislib/components/XAxis/_x_axis'));
    var split = Private(require('components/vislib/components/XAxis/_split'));

    return function (that) {
      // split
      d3.select('.x-axis-div-wrapper').datum(that.data).call(split);
      // drawing axis
      return d3.selectAll('.x-axis-div').call(renderXAxis(that));
    };
  };
});
