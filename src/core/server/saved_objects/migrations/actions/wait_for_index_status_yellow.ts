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
import { DEFAULT_TIMEOUT } from './constants';

/** @internal */
export interface WaitForIndexStatusYellowParams {
  client: ElasticsearchClient;
  index: string;
  timeout?: string;
}
/**
 * A yellow index status means the index's primary shard is allocated and the
 * index is ready for searching/indexing documents, but ES wasn't able to
 * allocate the replicas. When migrations proceed with a yellow index it means
 * we don't have as much data-redundancy as we could have, but waiting for
 * replicas would mean that v2 migrations fail where v1 migrations would have
 * succeeded. It doesn't feel like it's Kibana's job to force users to keep
 * their clusters green and even if it's green when we migrate it can turn
 * yellow at any point in the future. So ultimately data-redundancy is up to
 * users to maintain.
 */
export const waitForIndexStatusYellow =
  ({
    client,
    index,
    timeout = DEFAULT_TIMEOUT,
  }: WaitForIndexStatusYellowParams): TaskEither.TaskEither<RetryableEsClientError, {}> =>
  () => {
    return client.cluster
      .health(
        {
          index,
          wait_for_status: 'yellow',
          timeout,
        },
        // Don't reject on status code 408 so that we can handle the timeout
        // explicitly and provide more context in the error message
        { ignore: [408] }
      )
      .then((res) => {
        if (res.timed_out === true) {
          return Either.left({
            type: 'retryable_es_client_error' as const,
            message: `Timeout waiting for the status of the [${index}] index to become 'yellow'`,
          });
        }
        return Either.right({});
      })
      .catch(catchRetryableEsClientErrors);
  };
