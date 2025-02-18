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

/** @internal */
export interface RefreshIndexParams {
  client: ElasticsearchClient;
  index: string;
}
/**
 * Wait for Elasticsearch to reindex all the changes.
 */
export const refreshIndex =
  ({
    client,
    index,
  }: RefreshIndexParams): TaskEither.TaskEither<RetryableEsClientError, { refreshed: boolean }> =>
  () => {
    return client.indices
      .refresh({ index })
      .then(() => {
        return Either.right({ refreshed: true });
      })
      .catch(catchRetryableEsClientErrors);
  };
