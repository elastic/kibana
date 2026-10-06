/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectTypeExcludeFromUpgradeFilterHook } from '@kbn/core-saved-objects-server';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { type DocumentIdAndType, type UnknownDocsFound } from './check_for_unknown_docs';
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
export interface CleanupNotNeeded {
  type: 'cleanup_not_needed';
}
/**
 * Cleans up unknown and excluded types from the specified index.
 */
export declare const cleanupUnknownAndExcluded: ({
  client,
  indexName,
  discardUnknownDocs,
  excludeOnUpgradeQuery,
  excludeFromUpgradeFilterHooks,
  hookTimeoutMs,
  knownTypes,
  removedTypes,
}: CleanupUnknownAndExcludedParams) => TaskEither.TaskEither<
  RetryableEsClientError | UnknownDocsFound,
  CleanupStarted | CleanupNotNeeded
>;
