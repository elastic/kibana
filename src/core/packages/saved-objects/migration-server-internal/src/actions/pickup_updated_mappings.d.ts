/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
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
export declare const pickupUpdatedMappings: (
  client: ElasticsearchClient,
  index: string,
  batchSize: number,
  query?: QueryDslQueryContainer
) => TaskEither.TaskEither<RetryableEsClientError, UpdateByQueryResponse>;
