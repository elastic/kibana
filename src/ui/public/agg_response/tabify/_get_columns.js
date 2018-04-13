import _ from 'lodash';

export function tabifyGetColumns(aggs, minimal, hierarchical) {

  if (minimal == null) minimal = !hierarchical;

  // pick the columns
  if (minimal) {
    return aggs.map(function (agg) {
      return { aggConfig: agg };
    });
  }

  // supposed to be bucket,...metrics,bucket,...metrics
  const columns = [];

  // seperate the metrics
  const grouped = _.groupBy(aggs, function (agg) {
    return agg.schema.group;
  });

  if (!grouped.buckets) {
    // return just the metrics, in column format
    return grouped.metrics.map(function (agg) {
      return { aggConfig: agg };
    });
  }

  // return the buckets, and after each place all of the metrics
  grouped.buckets.forEach(function (agg) {
    columns.push({ aggConfig: agg });
    grouped.metrics.forEach(function (metric) {
      columns.push({ aggConfig: metric });
    });
  });

  return columns;
}
