import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import ParentPipelineAggHelperProvider from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export default function AggTypeMetricMovingAvgProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const parentPipelineAggHelper = Private(ParentPipelineAggHelperProvider);

  return new MetricAggType({
    name: 'moving_avg',
    title: 'Moving Avg',
    subtype: parentPipelineAggHelper.subtype,
    makeLabel: agg => makeNestedLabel(agg, 'moving avg'),
    params: [
      ...parentPipelineAggHelper.params()
    ]
  });
}
