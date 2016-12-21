import moment from 'moment';

/* calling .subtract or .add on a moment object mutates the object
 * so this function shortcuts creating a fresh object */
function getTime(bucket) {
  return moment.utc(bucket[0]);
}

/* find the milliseconds of difference between 2 moment objects */
function getDelta(t1, t2) {
  return moment.duration(t1 - t2).asMilliseconds();
}

export default function filterPartialBuckets(min, max, bucketSize, options = {}) {
  return (bucket) => {
    const bucketTime = getTime(bucket);

    // timestamp is too late to be complete
    if (getDelta(max, bucketTime.add(bucketSize, 'seconds')) < (bucketSize * 1000)) {
      return false;
    }

    /* Table listing metrics don't need to filter the beginning of data for
     * partial buckets. They just boil down the data into max/min/last/slope
     * numbers instead of graphing it. So table listing data buckets pass
    * ignoreEarly */
    if (options.ignoreEarly !== true) {
      // timestamp is too early to be complete
      if (getDelta(bucketTime.subtract(bucketSize, 'seconds'), min) < 0) {
        return false;
      }
    }

    return true;
  };
}


