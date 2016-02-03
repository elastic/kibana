var _ = require('lodash');
export default function (buckets) {
  var previous;
  _.each(buckets, function (bucket) {
    if (previous) {
      bucket._previous = previous;
      previous._next = bucket;
    }
    previous = bucket;
  });
  return buckets;
};
