import { MetricAggType } from './metric_agg_type';
import { fieldFormats } from '../../registry/field_formats';

export const cardinalityMetricAgg = new MetricAggType({
  name: 'cardinality',
  title: 'Unique Count',
  makeLabel: function (aggConfig) {
    return 'Unique count of ' + aggConfig.getFieldDisplayName();
  },
  getFormat: function () {
    return fieldFormats.getDefaultInstance('number');
  },
  params: [
    {
      name: 'field'
    }
  ]
});
