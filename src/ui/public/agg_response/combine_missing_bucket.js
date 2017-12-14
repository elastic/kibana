export const combineMissingBucket = (aggId, bucket) => {
  if (bucket[aggId + '-missing'] && !bucket[aggId].buckets.find(bucket => bucket.key === '_missing_')) {
    bucket[aggId].buckets.push({
      key: '_missing_',
      ...bucket[aggId + '-missing']
    });
    delete bucket[aggId + '-missing'];
  }
};
