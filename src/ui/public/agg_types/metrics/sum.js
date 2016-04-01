define(function (require) {
  return function AggTypeMetricSumProvider(Private) {
    let MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));

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
