define(function (require) {
  return function ColumnDrawUtilService(d3, Private) {
    var renderColumnChart = Private(require('components/vislib/components/ColumnChart/column'));

    return function (that) {
      return d3.selectAll('.chart').call(renderColumnChart(that));
    };
  };
});
