import { MetricAggType } from 'ui/agg_types/metrics/metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export const serialDiffMetricAgg = new MetricAggType({
  name: 'serial_diff',
  title: 'Serial Diff',
  subtype: parentPipelineAggHelper.subtype,
  makeLabel: agg => makeNestedLabel(agg, 'serial diff'),
  params: [
    ...parentPipelineAggHelper.params()
  ],
  getFormat: parentPipelineAggHelper.getFormat
});
