/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { catchRetryableEsClientErrors } from './catch_retryable_es_client_errors';
import type { RetryableEsClientError } from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface UpdateMappingsParams {
  client: ElasticsearchClient;
  index: string;
  mappings: IndexMapping;
}
/**
 * Updates an index's mappings and runs an pickupUpdatedMappings task so that the mapping
 * changes are "picked up". Returns a taskId to track progress.
 */
export const updateMappings = ({
  client,
  index,
  mappings,
}: UpdateMappingsParams): TaskEither.TaskEither<
  RetryableEsClientError | 'incompatible_mapping_exception',
  'update_mappings_succeeded'
> => {
  return () => {
    return client.indices
      .putMapping({
        index,
        timeout: DEFAULT_TIMEOUT,
        ...mappings,
      })
      .then(() => Either.right('update_mappings_succeeded' as const))
      .catch(catchRetryableEsClientErrors)
      .catch(() => Either.left('incompatible_mapping_exception'));
  };
};
