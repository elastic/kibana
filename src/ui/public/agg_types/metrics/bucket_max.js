import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';

export function AggTypesMetricsBucketMaxProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'max_bucket',
    title: 'Max Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall max'),
    subtype: siblingPipelineAggHelper.subtype,
    params: [
      ...siblingPipelineAggHelper.params()
    ],
    getFormat: siblingPipelineAggHelper.getFormat
  });
}
