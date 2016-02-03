import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';

define(function (require) {
  return function AggTypeMetricSumProvider(Private) {
    var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

    return new MetricAggType({
      name: 'sum',
      title: 'Sum',
      makeLabel: function (aggConfig) {
        return 'Sum of ' + aggConfig.params.field.displayName;
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        }
      ]
    });
  };
});
