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
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface WaitForIndexStatusParams {
  client: ElasticsearchClient;
  index: string;
  timeout?: string;
  status: 'yellow' | 'green';
}

export interface IndexNotYellowTimeout {
  type: 'index_not_yellow_timeout';
  message: string;
}

export interface IndexNotGreenTimeout {
  type: 'index_not_green_timeout';
  message: string;
}

export function waitForIndexStatus({
  client,
  index,
  timeout,
  status,
}: WaitForIndexStatusParams & { status: 'yellow' }): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotYellowTimeout,
  {}
>;

export function waitForIndexStatus({
  client,
  index,
  timeout,
  status,
}: WaitForIndexStatusParams & { status: 'green' }): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotGreenTimeout,
  {}
>;

/**
 * Wait until an index status become either 'yellow' or 'green'.
 *
 * A yellow index status means the index's primary shard was allocated but ES
 * wasn't able to allocate the replica. Thus a yellow index can be searched
 * and read from but indexing documents with `wait_for_active_shards='all'`
 * will fail.
 *
 * A green index status means the index's primary and replica shards has been
 * allocated so we can search, read and index documents with
 * `wait_for_active_shards='all'`.
 */
export function waitForIndexStatus({
  client,
  index,
  timeout = DEFAULT_TIMEOUT,
  status,
}: WaitForIndexStatusParams): TaskEither.TaskEither<
  RetryableEsClientError | IndexNotYellowTimeout | IndexNotGreenTimeout,
  {}
> {
  return () => {
    return client.cluster
      .health(
        {
          index,
          wait_for_status: status,
          timeout,
        },
        {
          /* Don't reject on status code 408 so that we can handle the timeout
           * explicitly with a custom response type and provide more context in the error message
           */
          ignore: [408],
        }
      )
      .then((res) => {
        if (res.timed_out === true) {
          return Either.left({
            type: `index_not_${status}_timeout` as const,
            message: `[index_not_${status}_timeout] Timeout waiting for the status of the [${index}] index to become '${status}'`,
          });
        }
        return Either.right({});
      })
      .catch(catchRetryableEsClientErrors);
  };
}
