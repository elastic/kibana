import { get } from 'lodash';
import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';

export function AggTypesMetricsBucketAvgProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'avg_bucket',
    title: 'Average Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall average'),
    subtype: siblingPipelineAggHelper.subtype,
    params: [
      ...siblingPipelineAggHelper.params()
    ],
    getFormat: siblingPipelineAggHelper.getFormat,
    getValue: function (agg, bucket) {
      const customMetric = agg.params.customMetric;
      const scaleMetrics = customMetric.type && customMetric.type.isScalable();

      let value = bucket[agg.id] && bucket[agg.id].value;
      if (scaleMetrics) {
        const aggInfo = agg.params.customBucket.write();
        value *= get(aggInfo, 'bucketInterval.scale', 1);
      }
      return value;
    }
  });
}
