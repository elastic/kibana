import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import SiblingPipelineAggHelperProvider from './lib/sibling_pipeline_agg_helper';

export default function AggTypeMetricDerivativeProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const siblingPipelineHelper = Private(SiblingPipelineAggHelperProvider);

  return new MetricAggType({
    name: 'min_bucket',
    title: 'Min Bucket',
    makeLabel: agg => makeNestedLabel(agg, 'overall min'),
    group: 'Pipeline Aggregations',
    params: [
      ...siblingPipelineHelper.params()
    ]
  });
}
