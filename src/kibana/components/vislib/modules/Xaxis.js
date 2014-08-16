define(function (require) {
  return function XAxisFactory(d3, Private) {
    var _ = require('lodash');

    var renderXAxis = Private(require('components/vislib/components/XAxis/_draw'));

    function XAxis(data) {
      this.data = data.data;
      this.xValues = data.orderedKeys ? data.orderedKeys : data.xValues();
      this.xAxisFormatter = data.xAxisFormatter ? data.xAxisFormatter : data.get('xAxisFormatter');
    }

    XAxis.prototype.draw = function () {
      return renderXAxis(this);
    };

    XAxis.prototype.rotateAxisLabels = function (selection) {
      return selection.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.60em')
        .attr('transform', function () {
          return 'rotate(-90)';
        });
    };

    XAxis.prototype.filterAxisLabels = function (selection, nth) {
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? d.xAxisLabel : '';
        });
    };

    return XAxis;
  };
});
