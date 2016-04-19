import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';

export default function AggTypeMetricMaxProvider(Private) {
  let MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'max',
    title: 'Max',
    makeLabel: function (aggConfig) {
      return 'Max ' + aggConfig.params.field.displayName;
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number,date'
      }
    ]
  });
};
