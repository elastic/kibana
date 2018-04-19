import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { fieldFormats } from '../../registry/field_formats';

export function AggTypesMetricsCountProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);


  return new MetricAggType({
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
}
