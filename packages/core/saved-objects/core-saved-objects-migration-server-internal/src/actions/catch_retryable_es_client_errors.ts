/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';

const retryResponseStatuses = [
  503, // ServiceUnavailable
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
];

export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}

export const catchRetryableEsClientErrors = (
  e: EsErrors.ElasticsearchClientError
): Either.Either<RetryableEsClientError, never> => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (retryResponseStatuses.includes(e?.statusCode!) ||
        // ES returns a 400 Bad Request when trying to close or delete an
        // index while snapshots are in progress. This should have been a 503
        // so once https://github.com/elastic/elasticsearch/issues/65883 is
        // fixed we can remove this.
        e?.body?.error?.type === 'snapshot_in_progress_exception'))
  ) {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e?.message,
      error: e,
    });
  } else {
    throw e;
  }
};
