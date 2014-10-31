define(function (require) {
  var _ = require('lodash');

  return function getColumns(vis) {
    var aggs = vis.aggs.getSorted();

    // pick the columns
    if (!vis.isHierarchical()) {
      return aggs.map(function (agg) {
        return { aggConfig: agg };
      });
    }

    var columns = [];

    // columns are bucket,metric,bucket,metric...
    var metrics = _.where(aggs, function (agg) {
      return agg.schema.group === 'metrics';
    });

    aggs.forEach(function (agg) {
      if (agg.schema.group !== 'buckets') return;
      columns.push({ aggConfig: agg });
      metrics.forEach(function (metric) {
        columns.push({ aggConfig: metric });
      });
    });

    return columns;
  };
});