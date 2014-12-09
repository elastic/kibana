define(function (require) {
  var _ = require('lodash');
  var extractBuckets = require('components/agg_response/hierarchical/_extract_buckets');
  return function transformAggregationProvider(Private) {
    var AggConfigResult = require('components/vis/_agg_config_result');
    return function transformAggregation(agg, metric, aggData, parent) {
      return _.map(extractBuckets(aggData), function (bucket) {
        // Pick the appropriate value, if the metric doesn't exist then we just
        // use the count.
        var value = bucket.doc_count;
        if (bucket[metric.id] && !_.isUndefined(bucket[metric.id].value)) {
          value = bucket[metric.id].value;
        }

        // Create the new branch record
        var $parent = parent && parent.aggConfigResult;
        var aggConfigResult = new AggConfigResult(agg, $parent, value, bucket.key);
        var branch = {
          name: bucket.key,
          size: value,
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
          var nextBucket = bucket[agg._next.id];
          if (nextBucket && nextBucket.buckets) {
            branch.children = transformAggregation(agg._next, metric, nextBucket, branch);
          }
        }

        return branch;
      });
    };
  };
});
