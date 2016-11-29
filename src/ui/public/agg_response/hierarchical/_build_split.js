import collectKeys from 'ui/agg_response/hierarchical/_collect_keys';
import AggResponseHierarchicalTransformAggregationProvider from 'ui/agg_response/hierarchical/_transform_aggregation';
export default function biuldSplitProvider(Private) {
  let transformer = Private(AggResponseHierarchicalTransformAggregationProvider);
  return function (agg, metric, aggData) {
    // Ceate the split structure
    let split = { label: '', slices: { children: [] } };

    // Transform the aggData into splits
    split.slices.children = transformer(agg, metric, aggData);

    // Collect all the keys
    split.names = collectKeys(split.slices.children);
    return split;
  };
};
