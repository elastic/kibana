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
import { ElasticsearchClient } from '../../../elasticsearch';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '../../serialization';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface SearchResponse {
  outdatedDocuments: SavedObjectsRawDoc[];
}

export interface SearchForOutdatedDocumentsOptions {
  batchSize: number;
  targetIndex: string;
  outdatedDocumentsQuery?: estypes.QueryDslQueryContainer;
}

/**
 * Search for outdated saved object documents with the provided query. Will
 * return one batch of documents. Searching should be repeated until no more
 * outdated documents can be found.
 *
 * Used for testing only
 */
export const searchForOutdatedDocuments =
  (
    client: ElasticsearchClient,
    options: SearchForOutdatedDocumentsOptions
  ): TaskEither.TaskEither<RetryableEsClientError, SearchResponse> =>
  () => {
    return client
      .search<SavedObjectsRawDocSource>({
        index: options.targetIndex,
        // Return the _seq_no and _primary_term so we can use optimistic
        // concurrency control for updates
        seq_no_primary_term: true,
        size: options.batchSize,
        body: {
          query: options.outdatedDocumentsQuery,
          // Optimize search performance by sorting by the "natural" index order
          sort: ['_doc'],
        },
        // Return an error when targeting missing or closed indices
        allow_no_indices: false,
        // Don't return partial results if timeouts or shard failures are
        // encountered. This is important because 0 search hits is interpreted as
        // there being no more outdated documents left that require
        // transformation. Although the default is `false`, we set this
        // explicitly to avoid users overriding the
        // search.default_allow_partial_results cluster setting to true.
        allow_partial_search_results: false,
        // Improve performance by not calculating the total number of hits
        // matching the query.
        track_total_hits: false,
        // Reduce the response payload size by only returning the data we care about
        filter_path: [
          'hits.hits._id',
          'hits.hits._source',
          'hits.hits._seq_no',
          'hits.hits._primary_term',
        ],
      })
      .then((res) =>
        Either.right({ outdatedDocuments: (res.hits?.hits as SavedObjectsRawDoc[]) ?? [] })
      )
      .catch(catchRetryableEsClientErrors);
  };
