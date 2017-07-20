import _ from 'lodash';
import { extractBuckets } from 'ui/agg_response/hierarchical/_extract_buckets';
import AggConfigResult from 'ui/vis/agg_config_result';

export function HierarchicalTransformAggregationProvider() {
  return function transformAggregation(agg, metric, aggData, parent) {
    return _.map(extractBuckets(aggData, agg), function (bucket) {
      const aggConfigResult = new AggConfigResult(
        agg,
        parent && parent.aggConfigResult,
        metric.getValue(bucket),
        agg.getKey(bucket)
      );

      const branch = {
        name: agg.fieldFormatter()(bucket.key),
        size: aggConfigResult.value,
        aggConfig: agg,
        aggConfigResult: aggConfigResult
      };

      // if the parent is defined then we need to set the parent of the branch
      // this will be used later for filters for waking up the parent path.
      if (parent) {
        branch.parent = parent;
      }

      // If the next bucket exists and it has children the we need to
      // transform it as well. This is where the recursion happens.
      if (agg._next) {
        const nextBucket = bucket[agg._next.id];
        if (nextBucket && nextBucket.buckets) {
          branch.children = transformAggregation(agg._next, metric, nextBucket, branch);
        }
      }

      return branch;
    });
  };
}
