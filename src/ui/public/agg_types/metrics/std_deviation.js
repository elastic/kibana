import _ from 'lodash';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import AggTypesMetricsGetResponseAggConfigClassProvider from 'ui/agg_types/metrics/get_response_agg_config_class';
export default function AggTypeMetricStandardDeviationProvider(Private) {
  var MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  var getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);

  var responseAggConfigProps = {
    valProp: function () {
      var details = this.keyedDetails(this.params.customLabel)[this.key];
      return details.valProp;
    },
    makeLabel: function () {
      var details = this.keyedDetails(this.params.customLabel)[this.key];
      return details.title + ' of ' + this.fieldDisplayName();
    },
    keyedDetails: function (customLabel) {
      const label = customLabel ? customLabel : 'Standard Deviation';
      return {
        std_lower: {
          valProp: ['std_deviation_bounds', 'lower'],
          title: 'Lower ' + label
        },
        avg: {
          valProp: 'avg',
          title: 'Average'
        },
        std_upper: {
          valProp: ['std_deviation_bounds', 'upper'],
          title: 'Upper ' + label
        }
      };
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
