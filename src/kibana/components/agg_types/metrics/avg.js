define(function (require) {
  return function AggTypeMetricAvgProvider(Private) {
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));

    return new MetricAggType({
      name: 'avg',
      title: 'Average',
      makeLabel: function (aggConfig) {
        return 'Average ' + aggConfig.params.field.displayName;
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