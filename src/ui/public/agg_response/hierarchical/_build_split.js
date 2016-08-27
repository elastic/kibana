import _ from 'lodash';
import collectKeys from 'ui/agg_response/hierarchical/_collect_keys';
import AggResponseHierarchicalTransformAggregationProvider from 'ui/agg_response/hierarchical/_transform_aggregation';
export default function biuldSplitProvider(Private) {
  let transformer = Private(AggResponseHierarchicalTransformAggregationProvider);
  function showLabelCount(vis) {
    if (!vis || !vis.params || !vis.params.addLegendCount) return false;
    if (!vis.type.params.isLegendCountSupported) return false;
    return true;
  }
  function getSize(name, children) {
    let nextChildren = _.pluck(children, 'children');
    let sizes = _.pluck(children, 'size');
    let size = _.reduce(children, (sum, child) => {
      if (child.children) sum += getSize(name, child.children);
      if (child.name === name) sum += child.size;
      return sum;
    }, 0);
    return size;
  }
  return function (agg, metric, aggData) {
    // Create the split structure
    let split = { label: '', slices: { children: [] } };

    // Transform the aggData into splits
    split.slices.children = transformer(agg, metric, aggData);

    // Collect all the keys
    split.names = collectKeys(split.slices.children);

    split.labels = {};
    _.map(split.names, name => {
      const size = getSize(name, split.slices.children);
      if (showLabelCount(agg.vis)) {
        split.labels[name] = `${name} (${size})`;
      } else {
        split.labels[name] = name;
      }
    });

    return split;
  };
};
