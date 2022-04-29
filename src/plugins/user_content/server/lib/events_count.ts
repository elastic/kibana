/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface ContentEventCount {
  [savedObjectId: string]: { [dayRange: string]: number };
}

/**
 * Reduces an ES aggregation bucket of saved object events
 * and returns a map of so_id with its counter
 *
 * IN: [{
 *   key: 'abc-123', // Saved object id
 *   ...
 *   // "eventsCount" aggregation
 *   eventsCount: [
 *     {
 *       "from": 123456, // 7 days,
 *       "doc_count": 6
 *     },
 *     {
 *       "from": 345678, // 14 days,
 *       "doc_count": 13
 *     }
 *   ]
 * }]
 *
 * OUT = {
 *   "abc-123": {
 *     "7_days": 6,
 *     "14_days": 13,
 *   }
 * }
 */
export const bucketsAggregationToContentEventCount = (
  buckets: estypes.AggregationsStringTermsBucket[],
  daysRanges: number[]
): ContentEventCount => {
  const daysRangesSorted = daysRanges.sort((a, b) => a - b);

  const aggregated = buckets.reduce((eventCountById, savedObjectBucket) => {
    const { key: savedObjectId } = savedObjectBucket;

    // Sub aggregation "eventsCount"
    const eventsCount = savedObjectBucket.eventsCount as estypes.AggregationsRangeAggregate;
    const byDaysBuckets = eventsCount.buckets as estypes.AggregationsRangeBucket[];

    if (byDaysBuckets.length > daysRangesSorted.length) {
      // We won't be able to aggregate if we have more buckets than the days ranges provided
      // This should never happen, probably an error in the implementation.
      throw new Error(
        `Can't aggregate event count as the days ranges provided does not match the ES aggregate buckets`
      );
    }

    // We sort in reverse order the "from" as 7 days has a bigger millisecond since epoch
    const byDaysBucketsSorted = byDaysBuckets.sort(({ from: a }, { from: b }) => b! - a!);

    const aggregateByDays = byDaysBucketsSorted.reduce((byDays, item, index) => {
      const day = daysRangesSorted[index];
      byDays[`${day}_days`] = item.doc_count;
      return byDays;
    }, {} as { [dayRange: string]: number });

    eventCountById[savedObjectId] = aggregateByDays;

    return eventCountById;
  }, {} as ContentEventCount);

  return aggregated;
};
