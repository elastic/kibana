import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';

export const minMetricAgg = new MetricAggType({
  name: 'min',
  title: 'Min',
  makeLabel: function (aggConfig) {
    return 'Min ' + aggConfig.getFieldDisplayName();
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'number,date'
    }
  ]
});
