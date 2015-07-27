define(function (require) {
  return function AggTypeMetricStandardDeviationProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('ui/agg_types/metrics/MetricAggType'));
    var getResponseAggConfigClass = Private(require('ui/agg_types/metrics/getResponseAggConfigClass'));

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
        var ValueAggConfig = getResponseAggConfigClass(agg, responseAggConfigProps);

        return [
          new ValueAggConfig('std_lower'),
          new ValueAggConfig('avg'),
          new ValueAggConfig('std_upper')
        ];
      },

      getValue: function (agg, bucket) {
        return _.get(bucket[agg.parentId], agg.valProp());
      }
    });
  };
});