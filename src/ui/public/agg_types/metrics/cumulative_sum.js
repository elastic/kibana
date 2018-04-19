import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export const cumulativeSumMetricAgg = new MetricAggType({
  name: 'cumulative_sum',
  title: 'Cumulative Sum',
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => makeNestedLabel(agg, 'cumulative sum'),
  params: [
    ...parentPipelineAggHelper.params()
  ],
  getFormat: parentPipelineAggHelper.getFormat
});
