define(function (require) {
  return function AggTypeMetricCountProvider(Private) {
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var fieldFormats = Private(require('registry/field_formats'));

    return new MetricAggType({
      name: 'count',
      title: 'Count',
      hasNoDsl: true,
      makeLabel: function () {
        return 'Count';
      },
      getValue: function (agg, bucket) {
        return bucket.doc_count;
      },
      getFormat: function () {
        return fieldFormats.getDefaultInstance('number');
      }
    });
  };
});
