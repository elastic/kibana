import _ from 'lodash';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import AggTypesMetricsGetResponseAggConfigClassProvider from 'ui/agg_types/metrics/get_response_agg_config_class';
export default function AggTypeMetricStandardDeviationProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);

  const responseAggConfigProps = {
    valProp: function () {
      const details = this.keyedDetails(this.params.customLabel)[this.key];
      return details.valProp;
    },
    makeLabel: function () {
      const fieldDisplayName = this.getFieldDisplayName();
      const details = this.keyedDetails(this.params.customLabel, fieldDisplayName);
      return _.get(details, [this.key, 'title']);
    },
    keyedDetails: function (customLabel, fieldDisplayName) {
      const label = customLabel ? customLabel : 'Standard Deviation of ' + fieldDisplayName;
      return {
        std_lower: {
          valProp: ['std_deviation_bounds', 'lower'],
          title: 'Lower ' + label
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
      return 'Standard Deviation of ' + agg.getFieldDisplayName();
    },
    params: [
      {
        name: 'field',
        filterFieldTypes: 'number'
      }
    ],

    getResponseAggs: function (agg) {
      const ValueAggConfig = getResponseAggConfigClass(agg, responseAggConfigProps);

      return [
        new ValueAggConfig('std_lower'),
        new ValueAggConfig('std_upper')
      ];
    },

    getValue: function (agg, bucket) {
      return _.get(bucket[agg.parentId], agg.valProp());
    }
  });
}
