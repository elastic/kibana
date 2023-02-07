/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import type {
  BulkIndexByScrollFailure,
  DeleteByQueryResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import {
  checkForUnknownDocs,
  type DocumentIdAndType,
  type UnknownDocsFound,
} from './check_for_unknown_docs';
import { isTypeof } from '.';
import { calculateExcludeFilters } from './calculate_exclude_filters';
import { REMOVED_TYPES } from '../core/unused_types';

/** @internal */
export interface CleanupUnknownAndExcludedParams {
  client: ElasticsearchClient;
  indexName: string;
  discardUnknownDocs: boolean;
  excludeOnUpgradeQuery: QueryDslQueryContainer;
  excludeFromUpgradeFilterHooks: Record<string, SavedObjectTypeExcludeFromUpgradeFilterHook>;
  hookTimeoutMs?: number;
  knownTypes: string[];
}

/** @internal */
export interface DeleteByQueryErrorResponse {
  type: 'delete_failed';
  conflictingDocuments: BulkIndexByScrollFailure[];
}

export interface CleanupSuccessful {
  type: 'cleanup_successful';
  unknownDocs?: DocumentIdAndType[];
}

const deleteByQuery = (
  client: ElasticsearchClient,
  index: string,
  deleteQuery: QueryDslQueryContainer,
  unknownDocs?: DocumentIdAndType[]
): TaskEither.TaskEither<
  RetryableEsClientError | DeleteByQueryErrorResponse,
  CleanupSuccessful
> => {
  return () => {
    return client
      .deleteByQuery({
        index,
        query: deleteQuery,
        wait_for_completion: true,
        refresh: true,
      })
      .then((response: DeleteByQueryResponse) => {
        if (!response.failures || !response.failures.length) {
          return Either.right({
            type: 'cleanup_successful' as const,
            unknownDocs,
          });
        } else {
          return Either.left({
            type: 'delete_failed' as const,
            conflictingDocuments: response.failures,
          });
        }
      })
      .catch(catchRetryableEsClientErrors);
  };
};

/**
 * Cleans up unknown and excluded types from the specified index.
 */
export const cleanupUnknownAndExcluded = ({
  client,
  indexName,
  discardUnknownDocs,
  excludeOnUpgradeQuery,
  excludeFromUpgradeFilterHooks,
  hookTimeoutMs,
  knownTypes,
}: CleanupUnknownAndExcludedParams): TaskEither.TaskEither<
  RetryableEsClientError | UnknownDocsFound | DeleteByQueryErrorResponse,
  CleanupSuccessful
> => {
  return pipe(
    checkForUnknownDocs({ client, indexName, knownTypes, excludeOnUpgradeQuery }),
    TaskEither.chain(
      (
        unknownDocsRes: {} | UnknownDocsFound
      ): TaskEither.TaskEither<
        RetryableEsClientError | UnknownDocsFound | DeleteByQueryErrorResponse,
        CleanupSuccessful
      > => {
        let unknownDocs: DocumentIdAndType[];
        let unknownDocTypes: string[] = [];
        if (isTypeof(unknownDocsRes, 'unknown_docs_found')) {
          unknownDocs = unknownDocsRes.unknownDocs;
          unknownDocTypes = [...new Set(unknownDocs.map(({ type }) => type))];
          if (!discardUnknownDocs) {
            return TaskEither.left({
              type: 'unknown_docs_found' as const,
              unknownDocs: unknownDocsRes.unknownDocs,
            });
          }
        }

        return pipe(
          calculateExcludeFilters({ client, excludeFromUpgradeFilterHooks, hookTimeoutMs }),
          TaskEither.chain((excludeFiltersRes) => {
            // we must delete everything that matches:
            // - any of the plugin-defined exclude filters
            // - OR any of the unknown types
            const deleteQuery: QueryDslQueryContainer = {
              bool: {
                should: [
                  ...excludeFiltersRes.filterClauses,
                  ...REMOVED_TYPES.map((type) => ({ term: { type } })),
                  ...unknownDocTypes.map((type) => ({ term: { type } })),
                ],
              },
            };
            return deleteByQuery(client, indexName, deleteQuery, unknownDocs);
          })
        );
      }
    )
  );
};
