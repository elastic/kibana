define(function (require) {
  return function GetColumnsProvider(Private) {
    let _ = require('lodash');
    let AggConfig = Private(require('ui/Vis/AggConfig'));

    return function getColumns(vis, minimal) {
      let aggs = vis.aggs.getResponseAggs();

      if (minimal == null) minimal = !vis.isHierarchical();

      if (!vis.aggs.bySchemaGroup.metrics) {
        aggs.push(new AggConfig(vis, {
          type: 'count',
          schema: vis.type.schemas.metrics[0].name
        }));
      }

      // pick the columns
      if (minimal) {
        return aggs.map(function (agg) {
          return { aggConfig: agg };
        });
      }

      // supposed to be bucket,...metrics,bucket,...metrics
      let columns = [];

      // seperate the metrics
      let grouped = _.groupBy(aggs, function (agg) {
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
