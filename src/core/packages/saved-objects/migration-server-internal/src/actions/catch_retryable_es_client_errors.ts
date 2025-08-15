/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server';

export interface RetryableEsClientError {
  type: 'retryable_es_client_error';
  message: string;
  error?: Error;
}

// Migrations also retry on Auth exceptions as this is a common failure for newly created
// clusters that might have misconfigured credentials.
const retryResponseStatuses = [
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

export const catchRetryableEsClientErrors = (
  e: EsErrors.ElasticsearchClientError
): Either.Either<RetryableEsClientError, never> => {
  if (isRetryableEsClientError(e, retryResponseStatuses)) {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e?.message,
      error: e,
    });
  } else {
    throw e;
  }
};

export const catchRetryableSearchPhaseExecutionException = (
  e: EsErrors.ResponseError
): Either.Either<RetryableEsClientError, never> => {
  if (e?.body?.error?.type === 'search_phase_execution_exception') {
    return Either.left({
      type: 'retryable_es_client_error' as const,
      message: e?.message,
      error: e,
    });
  } else {
    throw e;
  }
};
