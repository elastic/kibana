define(function (require) {
  return function AggTypeMetricCountProvider(Private) {
    var MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    var fieldFormats = Private(require('ui/registry/field_formats'));

    return new MetricAggType({
      name: 'count',
      title: 'Count',
      hasNoDsl: true,
      makeLabel: function () {
        return 'Count';
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('number');
      },
      getValue: function (agg, bucket) {
        return bucket.doc_count;
      }
    });
  };
});
