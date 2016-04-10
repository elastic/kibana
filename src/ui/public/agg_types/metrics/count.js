import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';

export default function AggTypeMetricCountProvider(Private) {
  var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  var fieldFormats = Private(RegistryFieldFormatsProvider);

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
