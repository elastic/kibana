define(function (require) {
  return function AggTypeMetricStandardDeviationProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var valueProps = {
      makeLabel: function () {
        var title = 'Average';
        if (this.key === 'std_lower') title = 'Lower Standard Deviation';
        if (this.key === 'std_upper') title = 'Upper Standard Deviation';
        return title + ' of ' + this.fieldDisplayName();
      }
    };

    return new MetricAggType({
      name: 'std_dev',
      dslName: 'extended_stats',
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
          new ValueAggConfig('std_lower', { valProp: ['std_deviation_bounds', 'lower'] }),
          new ValueAggConfig('avg'),
          new ValueAggConfig('std_upper', { valProp: ['std_deviation_bounds', 'upper'] })
        ];
      },

      getValue: function (agg, bucket) {
        return _.get(bucket[agg.parentId], agg.valProp || agg.key);
      }
    });
  };
});