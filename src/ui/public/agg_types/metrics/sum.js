import { MetricAggType } from './metric_agg_type';

export const sumMetricAgg = new MetricAggType({
  name: 'sum',
  title: 'Sum',
  makeLabel: function (aggConfig) {
    return 'Sum of ' + aggConfig.getFieldDisplayName();
  },
  params: [
    {
      name: 'field',
      filterFieldTypes: 'number'
    }
  ],
  isScalable: function () {
    return true;
  }
});
