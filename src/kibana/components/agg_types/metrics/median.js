define(function (require) {
  return function AggTypeMetricMaxProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));
    var percentiles = Private(require('components/agg_types/metrics/percentiles'));

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
