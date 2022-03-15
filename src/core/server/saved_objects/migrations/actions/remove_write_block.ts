/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface RemoveWriteBlockParams {
  client: ElasticsearchClient;
  index: string;
}

/**
 * Removes a write block from an index
 */
export const removeWriteBlock =
  ({
    client,
    index,
  }: RemoveWriteBlockParams): TaskEither.TaskEither<
    RetryableEsClientError,
    'remove_write_block_succeeded'
  > =>
  () => {
    return client.indices
      .putSettings(
        {
          index,
          // Don't change any existing settings
          preserve_existing: true,
          body: {
            blocks: {
              write: false,
            },
          },
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      )
      .then((res) => {
        return res.acknowledged === true
          ? Either.right('remove_write_block_succeeded' as const)
          : Either.left({
              type: 'retryable_es_client_error' as const,
              message: 'remove_write_block_failed',
            });
      })
      .catch(catchRetryableEsClientErrors);
  };
