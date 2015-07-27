define(function (require) {
  return function AggTypeMetricMaxProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    var getResponseAggConfigClass = Private(require('ui/agg_types/metrics/getResponseAggConfigClass'));
    var percentiles = Private(require('ui/agg_types/metrics/percentiles'));

    return new MetricAggType({
      name: 'median',
      dslName: 'percentiles',
      title: 'Median',
      makeLabel: function (aggConfig) {
        return 'Median ' + aggConfig.params.field.displayName;
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'percents',
          default: [50]
        }
      ],
      getResponseAggs: percentiles.getResponseAggs,
      getValue: percentiles.getValue
    });
  };
});
