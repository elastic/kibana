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
import type { Conflicts, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface DeleteByQueryParams {
  client: ElasticsearchClient;
  indexName: string;
  query: QueryDslQueryContainer;
  conflicts: Conflicts;
  refresh?: boolean;
}

/** @internal */
export interface DeleteByQueryResponse {
  taskId: string;
}

/**
 * Deletes documents matching the provided query
 */
export const deleteByQuery =
  ({
    client,
    indexName,
    query,
    conflicts,
    refresh = false,
  }: DeleteByQueryParams): TaskEither.TaskEither<RetryableEsClientError, DeleteByQueryResponse> =>
  () => {
    return client
      .deleteByQuery({
        index: indexName,
        query,
        refresh,
        conflicts,
        wait_for_completion: false,
      })
      .then(({ task: taskId }) => {
        return Either.right({ taskId: String(taskId!) });
      })
      .catch(catchRetryableEsClientErrors);
  };
