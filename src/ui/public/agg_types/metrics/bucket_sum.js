import { AggTypesMetricsMetricAggTypeProvider } from 'ui/agg_types/metrics/metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { SiblingPipelineAggHelperProvider } from './lib/sibling_pipeline_agg_helper';

export function AggTypesMetricsBucketSumProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const siblingPipelineHelper = Private(SiblingPipelineAggHelperProvider);

  return new MetricAggType({
    name: 'sum_bucket',
    title: 'Sum Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall sum'),
    subtype: siblingPipelineHelper.subtype,
    params: [
      ...siblingPipelineHelper.params()
    ]
  });
}
