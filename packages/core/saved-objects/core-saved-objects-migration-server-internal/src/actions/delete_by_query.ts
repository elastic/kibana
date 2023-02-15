/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import type {
  BulkIndexByScrollFailure,
  DeleteByQueryResponse,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  catchRetryableEsClientErrors,
  type RetryableEsClientError,
} from './catch_retryable_es_client_errors';

/** @internal */
export interface DeleteByQueryParams {
  client: ElasticsearchClient;
  indexName: string;
  query: QueryDslQueryContainer;
}

/** @internal */
export interface DeleteByQueryErrorResponse {
  type: 'delete_failed';
  conflictingDocuments: BulkIndexByScrollFailure[];
}

/**
 * Deletes documents matching the provided query
 */
export const deleteByQuery = ({
  client,
  indexName,
  query,
}: DeleteByQueryParams): TaskEither.TaskEither<
  RetryableEsClientError | DeleteByQueryErrorResponse,
  'delete_successful'
> => {
  return () => {
    return client
      .deleteByQuery({
        index: indexName,
        query,
        wait_for_completion: true,
        refresh: true,
        // we want to delete as many docs as we can in the current attempt
        conflicts: 'proceed',
      })
      .then((response: DeleteByQueryResponse) => {
        if (!response.failures || !response.failures.length) {
          return Either.right('delete_successful' as const);
        } else {
          return Either.left({
            type: 'delete_failed' as const,
            conflictingDocuments: response.failures,
          });
        }
      })
      .catch(catchRetryableEsClientErrors);
  };
};
