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
  mappings: Partial<IndexMapping>;
}

/** @internal */
export interface IncompatibleMappingException {
  type: 'incompatible_mapping_exception';
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
  RetryableEsClientError | IncompatibleMappingException,
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
      .catch((res) => {
        const errorType = res?.body?.error?.type;
        // ES throws this exact error when attempting to make incompatible updates to the mappigns
        if (
          res?.statusCode === 400 &&
          (errorType === 'illegal_argument_exception' ||
            errorType === 'strict_dynamic_mapping_exception' ||
            errorType === 'mapper_parsing_exception')
        ) {
          return Either.left({ type: 'incompatible_mapping_exception' });
        }
        return catchRetryableEsClientErrors(res);
      });
  };
};
