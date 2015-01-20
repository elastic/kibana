define(function (require) {
  return function AggTypeMetricStandardDeviationProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var valueProps = {
      makeLabel: function () {
        return this.key + ' of ' + this.fieldDisplayName();
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
          new ValueAggConfig('upper_std_deviation'),
          new ValueAggConfig('avg'),
          new ValueAggConfig('lower_std_deviation')
        ];
      },

      getValue: function (agg, bucket) {
        var stats = bucket[agg.parentId];
        switch (agg.key) {
        case 'upper_std_deviation':
          return stats.avg + stats.std_deviation;
        case 'lower_std_deviation':
          return stats.avg - stats.std_deviation;
        case 'avg':
          return stats.avg;
        }
      }
    });
  };
});