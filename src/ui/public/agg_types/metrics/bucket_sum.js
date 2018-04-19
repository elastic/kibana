import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';

export function AggTypesMetricsBucketSumProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'sum_bucket',
    title: 'Sum Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall sum'),
    subtype: siblingPipelineAggHelper.subtype,
    params: [
      ...siblingPipelineAggHelper.params()
    ],
    getFormat: siblingPipelineAggHelper.getFormat
  });
}
