/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_PIT_KEEP_ALIVE } from './open_pit';

/** @internal */
export interface ReadWithPit {
  outdatedDocuments: SavedObjectsRawDoc[];
  readonly lastHitSortValue: number[] | undefined;
  readonly totalHits: number | undefined;
}

/** @internal */
export interface ReadWithPitParams {
  client: ElasticsearchClient;
  pitId: string;
  query: estypes.QueryDslQueryContainer;
  batchSize: number;
  searchAfter?: number[];
  seqNoPrimaryTerm?: boolean;
}

/*
 * Requests documents from the index using PIT mechanism.
 * */
export const readWithPit =
  ({
    client,
    pitId,
    query,
    batchSize,
    searchAfter,
    seqNoPrimaryTerm,
  }: ReadWithPitParams): TaskEither.TaskEither<RetryableEsClientError, ReadWithPit> =>
  () => {
    return client
      .search<SavedObjectsRawDoc>({
        seq_no_primary_term: seqNoPrimaryTerm,
        // Fail if the index being searched doesn't exist or is closed
        // allow_no_indices: false,
        // By default ES returns a 200 with partial results if there are shard
        // request timeouts or shard failures which can lead to data loss for
        // migrations
        allow_partial_search_results: false,
        // Sort fields are required to use searchAfter so we sort by the
        // natural order of the index which is the most efficient option
        // as order is not important for the migration
        sort: '_shard_doc:asc',
        pit: { id: pitId, keep_alive: DEFAULT_PIT_KEEP_ALIVE },
        size: batchSize,
        search_after: searchAfter,
        /**
         * We want to know how many documents we need to process so we can log the progress.
         * But we also want to increase the performance of these requests,
         * so we ask ES to report the total count only on the first request (when searchAfter does not exist)
         */
        track_total_hits: typeof searchAfter === 'undefined',
        query,
      })
      .then((body) => {
        const totalHits =
          typeof body.hits.total === 'number'
            ? body.hits.total // This format is to be removed in 8.0
            : body.hits.total?.value;
        const hits = body.hits.hits;

        if (hits.length > 0) {
          return Either.right({
            // @ts-expect-error @elastic/elasticsearch _source is optional
            outdatedDocuments: hits as SavedObjectsRawDoc[],
            lastHitSortValue: hits[hits.length - 1].sort as number[],
            totalHits,
          });
        }

        return Either.right({
          outdatedDocuments: [],
          lastHitSortValue: undefined,
          totalHits,
        });
      })
      .catch(catchRetryableEsClientErrors);
  };
