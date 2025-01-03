/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { pipe } from 'fp-ts/lib/function';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import {
  checkForUnknownDocs,
  type DocumentIdAndType,
  type UnknownDocsFound,
} from './check_for_unknown_docs';
import { isTypeof } from '.';
import { CalculatedExcludeFilter, calculateExcludeFilters } from './calculate_exclude_filters';
import { deleteByQuery } from './delete_by_query';

/** @internal */
export interface CleanupUnknownAndExcludedParams {
  client: ElasticsearchClient;
  indexName: string;
  discardUnknownDocs: boolean;
  excludeOnUpgradeQuery: QueryDslQueryContainer;
  excludeFromUpgradeFilterHooks: Record<string, SavedObjectTypeExcludeFromUpgradeFilterHook>;
  hookTimeoutMs?: number;
  knownTypes: string[];
  removedTypes: string[];
}

/** @internal */
export interface CleanupStarted {
  type: 'cleanup_started';
  /** Sample (1000 types * 100 docs per type) of the unknown documents that have been found */
  unknownDocs: DocumentIdAndType[];
  /** Any errors that were encountered during filter calculation, keyed by the type name */
  errorsByType: Record<string, Error>;
  /** the id of the asynchronous delete task */
  taskId: string;
}

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
  removedTypes,
}: CleanupUnknownAndExcludedParams): TaskEither.TaskEither<
  RetryableEsClientError | UnknownDocsFound,
  CleanupStarted
> => {
  let unknownDocs: DocumentIdAndType[] = [];
  let unknownDocTypes: string[] = [];
  let errorsByType: Record<string, Error> = {};

  return pipe(
    // check if there are unknown docs
    checkForUnknownDocs({ client, indexName, knownTypes, excludeOnUpgradeQuery }),

    // make sure we are allowed to get rid of them (in case there are some)
    TaskEither.chainEitherKW((unknownDocsRes: {} | UnknownDocsFound) => {
      if (isTypeof(unknownDocsRes, 'unknown_docs_found')) {
        unknownDocs = unknownDocsRes.unknownDocs;
        unknownDocTypes = [...new Set(unknownDocs.map(({ type }) => type))];
        if (!discardUnknownDocs) {
          return Either.left({
            type: 'unknown_docs_found' as const,
            unknownDocs: unknownDocsRes.unknownDocs,
          });
        }
      }
      return Either.right(undefined);
    }),

    // calculate exclude filters (we use them to build the query for documents that must be deleted)
    TaskEither.chainW(
      (): TaskEither.TaskEither<RetryableEsClientError, CalculatedExcludeFilter> =>
        calculateExcludeFilters({ client, excludeFromUpgradeFilterHooks, hookTimeoutMs })
    ),

    // actively delete unwanted documents
    TaskEither.chainW((excludeFiltersRes) => {
      errorsByType = excludeFiltersRes.errorsByType;

      // we must delete everything that matches:
      // - any of the plugin-defined exclude filters
      // - OR any of the unknown types
      const deleteQuery: QueryDslQueryContainer = {
        bool: {
          should: [
            ...excludeFiltersRes.filterClauses,
            ...removedTypes.map((type) => ({ term: { type } })),
            ...unknownDocTypes.map((type) => ({ term: { type } })),
          ],
        },
      };

      return deleteByQuery({
        client,
        indexName,
        query: deleteQuery,
        // we want to delete as many docs as we can in the current attempt
        conflicts: 'proceed',
        // instead of forcing refresh after each delete attempt,
        // we opt for a delayRetry mechanism when conflicts appear,
        // letting the periodic refresh kick in
        refresh: false,
      });
    }),

    // map response output
    TaskEither.chainEitherKW((res) => {
      return Either.right({
        type: 'cleanup_started' as const,
        taskId: res.taskId,
        unknownDocs,
        errorsByType,
      });
    })
  );
};
