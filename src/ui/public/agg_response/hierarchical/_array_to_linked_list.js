define(function (require) {
  let _ = require('lodash');
  return function (buckets) {
    let previous;
    _.each(buckets, function (bucket) {
      if (previous) {
        bucket._previous = previous;
        previous._next = bucket;
      }
      previous = bucket;
    });
    return buckets;
  };
});
