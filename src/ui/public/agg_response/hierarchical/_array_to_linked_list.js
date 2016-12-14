import _ from 'lodash';
export default function (buckets) {
  let previous;
  _.each(buckets, function (bucket) {
    if (previous) {
      bucket._previous = previous;
      previous._next = bucket;
    }
    previous = bucket;
  });
  return buckets;
}
