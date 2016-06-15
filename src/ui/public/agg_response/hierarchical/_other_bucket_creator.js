define(function (require) {
  let _ = require('lodash');

  let getBucketValue = function (metric, bucket) {
    if (metric.type.name === 'count') {
      return bucket.doc_count;
    } else {
      return bucket[metric.id].value;
    }
  };

  let createOtherBucket = function (metric, parentValue, data, agg, deepCreate) {
    let isCountMetric = metric.type.name === 'count';

    // isCountMetric | parentValue |  value for other bucket
    //       1       |  defined    |  sum_other_doc_count
    //       1       |  undefined  |  sum_other_doc_count
    //       0       |  defined    |  parentValue - sum(existing buckets)
    //       0       |  undefined  |  do not create other bucket since we have no suitable value for it
    if (!isCountMetric && (parentValue === undefined)) return;

    // are there other documents? and are there any buckets at all?
    // -> if there are no other docs, the sub-aggregation values should match the value of the parent
    if (data.sum_other_doc_count && data.buckets) {
      let otherBucket = {
        'doc_count': data.sum_other_doc_count,
        'key': 'Others'
      };

      if (!isCountMetric) {
        // check to be sure that parentValue is defined
        if (parentValue === undefined) return;

        let sumOfExistingBuckets = Math.abs(data.buckets.reduce(function (sum, bucket) {
          return sum + getBucketValue(metric, bucket);
        }, 0));

        otherBucket[metric.id] = { value: (parentValue - sumOfExistingBuckets) };
      }

      // 'split' requires at least two levels of bucket, otherwise the circle is not shown
      if (deepCreate || (agg.schema.name === 'split')) {
        // create sub-buckets for "Other" bucket for each aggregation
        let currAgg = agg;
        let currBucket = otherBucket;
        while (currAgg._next) {
          let newOtherSubBucket = { 'doc_count': otherBucket.doc_count, 'key': 'Others' };

          currAgg = currAgg._next;
          otherBucket[currAgg.id] = { 'buckets': [ newOtherSubBucket ] };
          currBucket = newOtherSubBucket;
        }
      }

      // add new bucket with all its sub-buckets
      data.buckets.push(otherBucket);
    }
  };

  // iterate all buckets and their sub-buckets in order to add "Other" buckets
  let checkForOtherBuckets = function (metric, parentValue, data, agg, deepCreate) {
    if (agg._next) {
      _.each(data.buckets, function (bucket) {
        let nextData = bucket[agg._next.id];
        let thisValue = getBucketValue(metric, bucket);

        checkForOtherBuckets(metric, thisValue, nextData, agg._next, deepCreate);
      });
    }

    createOtherBucket(metric, parentValue, data, agg, deepCreate);
  };

  return function (metric, data, agg, deepCreate) {
    checkForOtherBuckets(metric, undefined, data, agg, deepCreate);
  };
});
