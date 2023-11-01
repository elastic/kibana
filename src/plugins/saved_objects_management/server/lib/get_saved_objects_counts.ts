/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

export const getSavedObjectCounts = async ({
  types,
  options,
  client,
}: {
  types: string[];
  options: SavedObjectsFindOptions;
  client: SavedObjectsClientContract;
}): Promise<Record<string, number>> => {
  const body = await client.find<void, { types: estypes.AggregationsStringTermsAggregate }>({
    ...options,
    type: types,
    perPage: 0,
    aggs: {
      types: {
        terms: {
          field: 'type',
          size: types.length,
        },
      },
    },
  });

  const buckets =
    (body.aggregations?.types?.buckets as estypes.AggregationsStringTermsBucketKeys[]) || [];

  const counts = buckets.reduce((memo, bucket) => {
    memo[bucket.key] = bucket.doc_count;
    return memo;
  }, {} as Record<string, number>);

  return counts;
};
