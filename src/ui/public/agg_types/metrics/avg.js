import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';

export function AggTypesMetricsAvgProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'avg',
    title: 'Average',
    makeLabel: function (aggConfig) {
      return 'Average ' + aggConfig.getFieldDisplayName();
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number'
      }
    ]
  });
}
