import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { AggTypesMetricsPercentilesProvider } from './percentiles';

export function AggTypesMetricsMedianProvider(Private) {

  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const percentiles = Private(AggTypesMetricsPercentilesProvider);

  return new MetricAggType({
    name: 'median',
    dslName: 'percentiles',
    title: 'Median',
    makeLabel: function (aggConfig) {
      return 'Median ' + aggConfig.getFieldDisplayName();
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
}
