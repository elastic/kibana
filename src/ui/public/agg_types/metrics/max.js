import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';

export default function AggTypeMetricMaxProvider(Private) {
  var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

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
