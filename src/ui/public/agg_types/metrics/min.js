import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';

export function AggTypesMetricsMinProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'min',
    title: 'Min',
    makeLabel: function (aggConfig) {
      return 'Min ' + aggConfig.getFieldDisplayName();
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number,date'
      }
    ]
  });
}
