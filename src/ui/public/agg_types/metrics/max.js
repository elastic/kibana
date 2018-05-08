import { MetricAggType } from './metric_agg_type';

export const maxMetricAgg = new MetricAggType({
  name: 'max',
  title: 'Max',
  makeLabel: function (aggConfig) {
    return 'Max ' + aggConfig.getFieldDisplayName();
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'number,date'
    }
  ]
});
