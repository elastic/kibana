define(function (require) {
  return function BucketCountBetweenProvider() {

    /**
     * Count the number of bucket aggs between two agg config objects owned
     * by the same vis.
     *
     * If one of the two aggs was not found in the agg list, returns null.
     * If a was found after b, the count will be negative
     * If a was found first, the count will be positive.
     *
     * @param  {AggConfig} aggConfigA - the aggConfig that is expected first
     * @param  {AggConfig} aggConfigB - the aggConfig that is expected second
     * @return {null|number}
     */
    function bucketCountBetween(aggConfigA, aggConfigB) {
      let aggs = aggConfigA.vis.aggs.getRequestAggs();

      let aIndex = aggs.indexOf(aggConfigA);
      let bIndex = aggs.indexOf(aggConfigB);

      if (aIndex === -1 || bIndex === -1) {
        return null;
      }

      // return a negative distance, if b is before a
      let negative = (aIndex > bIndex);

      let count = aggs
        .slice(Math.min(aIndex, bIndex), Math.max(aIndex, bIndex))
        .reduce(function (count, cfg) {
          if (cfg === aggConfigA || cfg === aggConfigB || cfg.schema.group !== 'buckets') {
            return count;
          } else {
            return count + 1;
          }
        }, 0);

      return (negative ? -1 : 1) * count;
    }

    return bucketCountBetween;
  };
});
