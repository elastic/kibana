define(function (require) {
  return function AggTypeMetricStandardDeviationProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var responseAggConfigProps = {
      valProp: function () {
        var details = this.keyedDetails[this.key];
        return details.valProp;
      },
      makeLabel: function () {
        var details = this.keyedDetails[this.key];
        return details.title + ' of ' + this.fieldDisplayName();
      },
      keyedDetails: {
        std_lower: {
          valProp: ['std_deviation_bounds', 'lower'],
          title: 'Lower Standard Deviation'
        },
        avg: {
          valProp: 'avg',
          title: 'Average'
        },
        std_upper: {
          valProp: ['std_deviation_bounds', 'upper'],
          title: 'Upper Standard Deviation'
        }
      }
    };

    function getValAggConfig(agg, key) {
      var ValueAggConfig = getResponseAggConfig(agg, responseAggConfigProps);
      return new ValueAggConfig(key);
    }

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
        return [
          getValAggConfig(agg, 'std_lower'),
          getValAggConfig(agg, 'avg'),
          getValAggConfig(agg, 'std_upper')
        ];
      },

      getValue: function (agg, bucket) {
        return _.get(bucket[agg.parentId], agg.valProp());
      }
    });
  };
});