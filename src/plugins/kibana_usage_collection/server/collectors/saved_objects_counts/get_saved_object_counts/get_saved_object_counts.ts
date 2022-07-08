/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';

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
}

/**
 * Returns the total number of Saved Objects matching the specified `soTypes`.
 * It also returns a break-down of the document count for all the types specified in `soTypes`.
 *
 * @param esClient The {@link ElasticsearchClient} to use when performing the aggregation.
 * @param kibanaIndex The index where SOs are stored. Typically '.kibana'.
 * @param soTypes The results will only include the specified SO types.
 * @returns {@link SavedObjectsCounts}
 */
export async function getSavedObjectsCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string, // Typically '.kibana'. We might need a way to obtain it from the SavedObjects client (or the SavedObjects client to provide a way to run aggregations?)
  soTypes: string[]
): Promise<SavedObjectsCounts> {
  const body = await esClient.search<void, { types: estypes.AggregationsStringTermsAggregate }>({
    index: kibanaIndex,
    ignore_unavailable: true,
    filter_path: ['aggregations.types.buckets', 'hits.total'],
    body: {
      size: 0,
      track_total_hits: true,
      query: { terms: { type: soTypes } },
      aggs: { types: { terms: { field: 'type', size: soTypes.length } } },
    },
  });

  const buckets =
    (body.aggregations?.types?.buckets as estypes.AggregationsStringTermsBucketKeys[]) || [];

  return {
    total: (typeof body.hits?.total === 'number' ? body.hits?.total : body.hits?.total?.value) ?? 0,
    per_type: buckets.map((perTypeEntry) => ({
      key: perTypeEntry.key,
      doc_count: perTypeEntry.doc_count,
    })),
  };
}
