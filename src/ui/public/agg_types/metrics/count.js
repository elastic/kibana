import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';
import { fieldFormats } from 'ui/registry/field_formats';

export const countMetricAgg = new MetricAggType({
  name: 'count',
  title: 'Count',
  hasNoDsl: true,
  makeLabel: function () {
    return 'Count';
  },
  getFormat: function () {
    return fieldFormats.getDefaultInstance('number');
  },
  getValue: function (agg, bucket) {
    return bucket.doc_count;
  },
  isScalable: function () {
    return true;
  }
});
