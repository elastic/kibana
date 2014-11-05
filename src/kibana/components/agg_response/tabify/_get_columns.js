define(function (require) {
  return function GetColumnsProvider(Private) {
    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));

    return function getColumns(vis) {
      var aggs = vis.aggs.getSorted();

      if (!vis.aggs.bySchemaGroup.metrics) {
        aggs.push(new AggConfig(vis, {
          type: 'count',
          schema: vis.type.schemas.metrics[0].name
        }));
      }

      // pick the columns
      if (!vis.isHierarchical()) {
        return aggs.map(function (agg) {
          return { aggConfig: agg };
        });
      }

      // supposed to be bucket,...metrics,bucket,...metrics
      var columns = [];

      // seperate the metrics
      var grouped = _.groupBy(aggs, function (agg) {
        return agg.schema.group;
      });

      if (!grouped.buckets) {
        // return just the metrics, in column format
        return grouped.metrics.map(function (agg) {
          return { aggConfig: agg };
        });
      }

      // return the buckets, and after each place all of the metrics
      grouped.buckets.forEach(function (agg, i) {
        columns.push({ aggConfig: agg });
        grouped.metrics.forEach(function (metric) {
          columns.push({ aggConfig: metric });
        });
      });

      return columns;
    };
  };
});