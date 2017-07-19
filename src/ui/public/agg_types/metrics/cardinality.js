import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

export function AggTypesMetricsCardinalityProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  return new MetricAggType({
    name: 'cardinality',
    title: 'Unique Count',
    makeLabel: function (aggConfig) {
      return 'Unique count of ' + aggConfig.getFieldDisplayName();
    },
    getFormat: function () {
      return fieldFormats.getDefaultInstance('number');
    },
    params: [
      {
        name: 'field'
      }
    ]
  });
}
