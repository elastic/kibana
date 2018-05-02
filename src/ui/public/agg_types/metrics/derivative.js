import { AggTypesMetricsMetricAggTypeProvider } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';

export function AggTypesMetricsDerivativeProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);

  return new MetricAggType({
    name: 'derivative',
    title: 'Derivative',
    subtype: parentPipelineAggHelper.subtype,
    makeLabel: agg => makeNestedLabel(agg, 'derivative'),
    params: [
      ...parentPipelineAggHelper.params()
    ],
    getFormat: parentPipelineAggHelper.getFormat
  });
}
