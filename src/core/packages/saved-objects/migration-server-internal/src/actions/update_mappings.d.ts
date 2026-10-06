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
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
/** @internal */
export interface UpdateMappingsParams {
  client: ElasticsearchClient;
  index: string;
  mappings: Partial<IndexMapping>;
}
/** @internal */
export interface IncompatibleMappingException {
  type: 'incompatible_mapping_exception';
}
/**
 * Attempts to update the SO index mappings.
 * Includes an automatic retry mechanism for retriable errors.
 * Returns an 'update_mappings_succeeded' upon success.
 * If changes in the mappings are NOT compatible and the update fails on ES side,
 * this method will return an 'incompatible_mapping_exception'.
 */
export declare const updateMappings: ({
  client,
  index,
  mappings,
}: UpdateMappingsParams) => TaskEither.TaskEither<
  RetryableEsClientError | IncompatibleMappingException,
  'update_mappings_succeeded'
>;
