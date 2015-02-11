define(function (require) {
  return function AggTypeMetricStandardDeviationProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var valueProps = {
      makeLabel: function () {
        var title = 'Average';
        if (this.key === 'std_deviation_bounds.lower') title = 'Lower Standard Deviation';
        if (this.key === 'std_deviation_bounds.upper') title = 'Upper Standard Deviation';
        return title + ' of ' + this.fieldDisplayName();
      }
    };

    return new MetricAggType({
      name: 'extended_stats',
      title: 'Standard Deviation',
      makeLabel: function (agg) {
        return 'Standard Deviation of ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        }
      ],

      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);
        return [
          new ValueAggConfig('std_deviation_bounds.lower'),
          new ValueAggConfig('avg'),
          new ValueAggConfig('std_deviation_bounds.upper')
        ];
      },

      getValue: function (agg, bucket) {
        return _.get(bucket[agg.parentId], agg.key);
      }
    });
  };
});