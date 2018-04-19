import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';

export function AggTypesMetricsSumProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'sum',
    title: 'Sum',
    makeLabel: function (aggConfig) {
      return 'Sum of ' + aggConfig.getFieldDisplayName();
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number'
      }
    ],
    isScalable: function () {
      return true;
    }
  });
}
