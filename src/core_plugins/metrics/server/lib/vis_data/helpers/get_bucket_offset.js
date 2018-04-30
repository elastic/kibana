export function getBucketKey(value, interval, offset = 0) {
  return Math.floor((value - offset) / interval) * interval + offset;
}

export function getBucketOffset(end, interval) {
  const bucketKey = getBucketKey(end, interval);
  return Math.floor((end - interval) - bucketKey);
}
