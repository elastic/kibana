import _ from 'lodash';
import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import AggTypesMetricsGetResponseAggConfigClassProvider from 'ui/agg_types/metrics/get_response_agg_config_class';
import AggTypesMetricsPercentilesProvider from 'ui/agg_types/metrics/percentiles';
export default function AggTypeMetricMedianProvider(Private) {
  let MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  let getResponseAggConfigClass = Private(AggTypesMetricsGetResponseAggConfigClassProvider);
  let percentiles = Private(AggTypesMetricsPercentilesProvider);

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
      },
      {
        write(agg, output) {
          output.params.keyed = false;
        }
      }
    ],
    getResponseAggs: percentiles.getResponseAggs,
    getValue: percentiles.getValue
  });
};
