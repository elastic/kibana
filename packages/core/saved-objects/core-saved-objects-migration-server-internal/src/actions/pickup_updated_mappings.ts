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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';

export interface UpdateByQueryResponse {
  taskId: string;
}

/**
 * Pickup updated mappings by performing an update by query operation on all
 * documents matching the passed in query. Returns a task ID which can be
 * tracked for progress.
 *
 * @remarks When mappings are updated to add a field which previously wasn't
 * mapped Elasticsearch won't automatically add existing documents to it's
 * internal search indices. So search results on this field won't return any
 * existing documents. By running an update by query we essentially refresh
 * these the internal search indices for all existing documents.
 * This action uses `conflicts: 'proceed'` allowing several Kibana instances
 * to run this in parallel.
 */
export const pickupUpdatedMappings =
  (
    client: ElasticsearchClient,
    index: string,
    batchSize: number,
    query?: QueryDslQueryContainer
  ): TaskEither.TaskEither<RetryableEsClientError, UpdateByQueryResponse> =>
  () => {
    return client
      .updateByQuery({
        // Ignore version conflicts that can occur from parallel update by query operations
        conflicts: 'proceed',
        // Return an error when targeting missing or closed indices
        allow_no_indices: false,
        index,
        // How many documents to update per batch
        scroll_size: batchSize,
        // force a refresh so that we can query the updated index immediately
        // after the operation completes
        refresh: true,
        // Create a task and return task id instead of blocking until complete
        wait_for_completion: false,
        // Only update the documents that match the provided query
        query,
      })
      .then(({ task: taskId }) => {
        return Either.right({ taskId: String(taskId!) });
      })
      .catch(catchRetryableEsClientErrors);
  };
