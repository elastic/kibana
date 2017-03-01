import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import ParentPipelineAggHelperProvider from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export default function AggTypeMetricSerialDiffProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const parentPipelineAggHelper = Private(ParentPipelineAggHelperProvider);

  return new MetricAggType({
    name: 'serial_diff',
    title: 'Serial Diff',
    subtype: parentPipelineAggHelper.subtype,
    makeLabel: agg => makeNestedLabel(agg, 'serial diff'),
    params: [
      ...parentPipelineAggHelper.params()
    ]
  });
}
