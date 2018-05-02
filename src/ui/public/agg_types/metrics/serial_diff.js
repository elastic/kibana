import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export function AggTypesMetricsSerialDiffProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'serial_diff',
    title: 'Serial Diff',
    subtype: parentPipelineAggHelper.subtype,
    makeLabel: agg => makeNestedLabel(agg, 'serial diff'),
    params: [
      ...parentPipelineAggHelper.params()
    ],
    getFormat: parentPipelineAggHelper.getFormat
  });
}
