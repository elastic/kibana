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
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface RemoveWriteBlockParams {
  client: ElasticsearchClient;
  index: string;
  timeout?: string;
}

/**
 * Removes a write block from an index
 */
export const removeWriteBlock =
  ({
    client,
    index,
    timeout = DEFAULT_TIMEOUT,
  }: RemoveWriteBlockParams): TaskEither.TaskEither<
    RetryableEsClientError,
    'remove_write_block_succeeded'
  > =>
  () => {
    return client.indices
      .putSettings({
        index,
        // Don't change any existing settings
        preserve_existing: true,
        settings: {
          blocks: {
            write: false,
          },
        },
        timeout,
      })
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
