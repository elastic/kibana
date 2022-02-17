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
export interface VerifyReindexParams {
  client: ElasticsearchClient;
  sourceIndex: string;
  targetIndex: string;
}

export const verifyReindex =
  ({
    client,
    sourceIndex,
    targetIndex,
  }: VerifyReindexParams): TaskEither.TaskEither<
    RetryableEsClientError | { type: 'verify_reindex_failed' },
    'verify_reindex_succeeded'
  > =>
  () => {
    const count = (index: string) =>
      client
        .count({
          index,
          // Return an error when targeting missing or closed indices
          allow_no_indices: false,
        })
        .then((res) => {
          return res.count;
        });

    return Promise.all([count(sourceIndex), count(targetIndex)])
      .then(([sourceCount, targetCount]) => {
        if (targetCount >= sourceCount) {
          return Either.right('verify_reindex_succeeded' as const);
        } else {
          return Either.left({ type: 'verify_reindex_failed' as const });
        }
      })
      .catch(catchRetryableEsClientErrors);
  };
