define(function (require) {
  return function AggTypeMetricMaxProvider(Private) {
    let _ = require('lodash');
    let MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    let getResponseAggConfigClass = Private(require('ui/agg_types/metrics/getResponseAggConfigClass'));
    let percentiles = Private(require('ui/agg_types/metrics/percentiles'));

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
