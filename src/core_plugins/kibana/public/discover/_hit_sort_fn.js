define(function () {
  return function HitSortFnFactory() {

    /**
     * Creates a sort function that will resort hits based on the value
     * es used to sort them.
     *
     * background:
     * When a hit is sorted by elasticsearch, es will write the values that it used
     * to sort them into an array at the top level of the hit like so
     *
     * ```
     * hits: {
     *   total: x,
     *   hits: [
     *     {
     *       _id: i,
     *       _source: {},
     *       sort: [
     *         // all values used to sort, in the order of precidance
     *       ]
     *     }
     *   ]
     * };
     * ```
     *
     * @param  {[type]} field     [description]
     * @param  {[type]} direction [description]
     * @return {[type]}           [description]
     */
    return function createHitSortFn(direction) {
      const descending = (direction === 'desc');

      return function sortHits(hitA, hitB) {
        let bBelowa = null;

        const aSorts = hitA.sort || [];
        const bSorts = hitB.sort || [];

        // walk each sort value, and compair until one is different
        for (let i = 0; i < bSorts.length; i++) {
          const a = aSorts[i];
          const b = bSorts[i];

          if (a == null || b > a) {
            bBelowa = !descending;
            break;
          }

          if (b < a) {
            bBelowa = descending;
            break;
          }
        }

        if (bBelowa !== null) {
          return bBelowa ? -1 : 1;
        } else {
          return 0;
        }

      };
    };

  };
});
