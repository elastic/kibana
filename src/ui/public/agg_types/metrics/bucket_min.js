import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';

export function AggTypesMetricsBucketMinProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'min_bucket',
    title: 'Min Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall min'),
    subtype: siblingPipelineAggHelper.subtype,
    params: [
      ...siblingPipelineAggHelper.params()
    ],
    getFormat: siblingPipelineAggHelper.getFormat
  });
}
