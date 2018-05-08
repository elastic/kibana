import { MetricAggType } from './metric_agg_type';
import { percentilesMetricAgg } from './percentiles';

export const medianMetricAgg = new MetricAggType({
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
  getResponseAggs: percentilesMetricAgg.getResponseAggs,
  getValue: percentilesMetricAgg.getValue
});
