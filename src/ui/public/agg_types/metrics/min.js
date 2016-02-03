import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/MetricAggType';

define(function (require) {
  return function AggTypeMetricMinProvider(Private) {
    var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

    return new MetricAggType({
      name: 'min',
      title: 'Min',
      makeLabel: function (aggConfig) {
        return 'Min ' + aggConfig.params.field.displayName;
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number,date'
        }
      ]
    });
  };
});
