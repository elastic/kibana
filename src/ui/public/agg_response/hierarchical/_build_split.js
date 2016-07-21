define(function (require) {
  return function biuldSplitProvider(Private) {
    var transformer = Private(require('ui/agg_response/hierarchical/_transform_aggregation'));
    var collectKeys = require('ui/agg_response/hierarchical/_collect_keys');
    return function (agg, metric, aggData) {
      // Ceate the split structure
      var split = { label: '', slices: { children: [] } };

      // Transform the aggData into splits
      split.slices.children = transformer(agg, metric, aggData);

      // Collect all the keys
      split.names = collectKeys(split.slices.children);
      return split;
    };
  };
});
