define(function (require) {
  var _ = require('lodash');
  var extractBuckets = require('components/visualize/_extract_buckets');
  return function transformAggregation(agg, metric, aggData) {
    return _.map(extractBuckets(aggData), function (bucket) {
      // Pick the appropriate value, if the metric doesn't exist then we just
      // use the count.
      var value = bucket[metric.id] && bucket[metric.id].value || bucket.doc_count;

      // Create the new branch record
      var branch = {
        name: bucket.key,
        size: value,
        aggConfig: agg
      };

      // If the next bucket exists and it has children the we need to
      // transform it as well. This is where the recursion happens.
      if (agg._next) {
        var nextBucket = bucket[agg._next.id];
        if (nextBucket && nextBucket.buckets) {
          branch.children = transformAggregation(agg._next, metric, nextBucket);
        }
      }

      return branch;
    });
  };
});
