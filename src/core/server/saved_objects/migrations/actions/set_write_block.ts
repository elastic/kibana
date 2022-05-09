/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '../../../elasticsearch';
import {
  catchRetryableEsClientErrors,
  RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import type { IndexNotFound } from '.';

/** @internal */
export interface SetWriteBlockParams {
  client: ElasticsearchClient;
  index: string;
}

/**
 * Sets a write block in place for the given index. If the response includes
 * `acknowledged: true` all in-progress writes have drained and no further
 * writes to this index will be possible.
 *
 * The first time the write block is added to an index the response will
 * include `shards_acknowledged: true` but once the block is in place,
 * subsequent calls return `shards_acknowledged: false`
 */
export const setWriteBlock =
  ({
    client,
    index,
  }: SetWriteBlockParams): TaskEither.TaskEither<
    IndexNotFound | RetryableEsClientError,
    'set_write_block_succeeded'
  > =>
  () => {
    return (
      client.indices
        .addBlock(
          {
            index,
            block: 'write',
          },
          { maxRetries: 0 /** handle retry ourselves for now */ }
        )
        // not typed yet
        .then((res) => {
          return res.acknowledged === true
            ? Either.right('set_write_block_succeeded' as const)
            : Either.left({
                type: 'retryable_es_client_error' as const,
                message: 'set_write_block_failed',
              });
        })
        .catch((e: EsErrors.ElasticsearchClientError) => {
          if (e instanceof EsErrors.ResponseError) {
            if (e.body?.error?.type === 'index_not_found_exception') {
              return Either.left({ type: 'index_not_found_exception' as const, index });
            }
          }
          throw e;
        })
        .catch(catchRetryableEsClientErrors)
    );
  };
//
