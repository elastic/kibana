import { collectKeys } from 'ui/agg_response/hierarchical/_collect_keys';
import { HierarchicalTransformAggregationProvider } from 'ui/agg_response/hierarchical/_transform_aggregation';

export function AggResponseHierarchicalBuildSplitProvider(Private) {
  const transformer = Private(HierarchicalTransformAggregationProvider);
  return function (agg, metric, aggData) {
    // Ceate the split structure
    const split = { label: '', slices: { children: [] } };

    // Transform the aggData into splits
    split.slices.children = transformer(agg, metric, aggData);

    // Collect all the keys
    split.names = collectKeys(split.slices.children);
    return split;
  };
}
