define(function (require) {
  return function AggTypeMetricMaxProvider(Private) {
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));

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
});