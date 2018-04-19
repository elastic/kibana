import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export function AggTypesMetricsCumulativeSumProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'cumulative_sum',
    title: 'Cumulative Sum',
    subtype: parentPipelineAggHelper.subtype,
    makeLabel: agg => makeNestedLabel(agg, 'cumulative sum'),
    params: [
      ...parentPipelineAggHelper.params()
    ],
    getFormat: parentPipelineAggHelper.getFormat
  });
}
