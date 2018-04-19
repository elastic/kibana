import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export const movingAvgMetricAgg = new MetricAggType({
  name: 'moving_avg',
  title: 'Moving Avg',
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => makeNestedLabel(agg, 'moving avg'),
  params: [
    ...parentPipelineAggHelper.params()
  ],
  getFormat: parentPipelineAggHelper.getFormat
});
