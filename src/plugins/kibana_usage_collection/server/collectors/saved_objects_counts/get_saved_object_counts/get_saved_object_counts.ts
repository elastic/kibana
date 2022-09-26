/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';

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
 * @param esClient The {@link ElasticsearchClient} to use when performing the aggregation.
 * @param kibanaIndex The index where SOs are stored. Typically '.kibana'.
 * @param soTypes The SO types we want to know about.
 * @param exclusive If `true`, the results will only contain the breakdown for the specified `soTypes`. Otherwise, it'll also return `missing` and `others` bucket.
 * @returns {@link SavedObjectsCounts}
 */
export async function getSavedObjectsCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string, // Typically '.kibana'. We might need a way to obtain it from the SavedObjects client (or the SavedObjects client to provide a way to run aggregations?)
  soTypes: string[],
  exclusive: boolean = false
): Promise<SavedObjectsCounts> {
  const body = await esClient.search<void, { types: estypes.AggregationsStringTermsAggregate }>({
    index: kibanaIndex,
    ignore_unavailable: true,
    filter_path: [
      'aggregations.types.buckets',
      'aggregations.types.sum_other_doc_count',
      'hits.total',
    ],
    body: {
      size: 0,
      track_total_hits: true,
      query: exclusive ? { terms: { type: soTypes } } : { match_all: {} },
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
    total: (typeof body.hits?.total === 'number' ? body.hits?.total : body.hits?.total?.value) ?? 0,
    per_type: perType,
    non_expected_types: nonExpectedTypes,
    others: body.aggregations?.types?.sum_other_doc_count ?? 0,
  };
}
