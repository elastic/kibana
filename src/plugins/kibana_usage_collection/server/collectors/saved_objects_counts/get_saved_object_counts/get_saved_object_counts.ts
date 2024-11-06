/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract } from '@kbn/core/server';

const MISSING_TYPE_KEY = 'missing_so_type';

/**
 * Object describing the output of {@link getSavedObjectsCounts} method.
 */
export interface SavedObjectsCounts {
  /**
   * Total number of Saved Objects
   */
  total: number;
  /**
   * Break-down of documents per Saved Object Type
   */
  per_type: Array<{ key: string; doc_count: number }>;
  /**
   * A list of SO types that showed up in the breakdown of the aggregation, but they are not included in the list of expected SO Types.
   */
  non_expected_types: string[];
  /**
   * Number of documents outside the break-down.
   * Typically, it should be 0, so it will highlight any unexpected documents if it's > 0.
   */
  others: number;
}

/**
 * Returns the total number of Saved Objects indexed in Elasticsearch.
 * It also returns a break-down of the document count for all the built-in SOs in Kibana (or the types specified in `soTypes`).
 * Finally, it completes the information with an `others` counter, that indicates the number of documents that do not match the SO type breakdown.
 *
 * @param soClient The {@link SavedObjectsClientContract} to use when performing the aggregation.
 * @param soTypes The SO types we want to know about.
 * @param options.exclusive If `true`, the results will only contain the breakdown for the specified `soTypes`. Otherwise, it'll also return `missing` and `others` bucket.
 * @param options.namespaces array of namespaces to search. Otherwise it'll default to all namespaces ['*'].
 * @returns {@link SavedObjectsCounts}
 */
export async function getSavedObjectsCounts(
  soClient: SavedObjectsClientContract,
  soTypes: string[],
  options?: {
    exclusive?: boolean;
    namespaces?: string[];
  }
): Promise<SavedObjectsCounts> {
  const { exclusive = false, namespaces = ['*'] } = options || {};

  const body = await soClient.find<void, { types: estypes.AggregationsStringTermsAggregate }>({
    type: soTypes,
    perPage: 0,
    namespaces,
    aggs: {
      types: {
        terms: {
          field: 'type',
          // If `exclusive == true`, we only care about the strict length of the provided SO types.
          // Otherwise, we want to account for the `missing` bucket (size and missing option).
          ...(exclusive
            ? { size: soTypes.length }
            : { missing: MISSING_TYPE_KEY, size: soTypes.length + 1 }),
        },
      },
    },
  });

  const buckets =
    (body.aggregations?.types?.buckets as estypes.AggregationsStringTermsBucketKeys[]) || [];

  const nonExpectedTypes: string[] = [];

  const perType = buckets.map((perTypeEntry) => {
    if (perTypeEntry.key !== MISSING_TYPE_KEY && !soTypes.includes(perTypeEntry.key)) {
      // If the breakdown includes any SO types that are not expected, highlight them in the nonExpectedTypes list.
      nonExpectedTypes.push(perTypeEntry.key);
    }

    return { key: perTypeEntry.key, doc_count: perTypeEntry.doc_count };
  });

  return {
    total: body.total,
    per_type: perType,
    non_expected_types: nonExpectedTypes,
    others: body.aggregations?.types?.sum_other_doc_count ?? 0,
  };
}
