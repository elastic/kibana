/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import pRetry from 'p-retry';
import { errors as EsErrors } from '@elastic/elasticsearch';

const retryResponseStatuses = [
  401, // AuthorizationException
  403, // AuthenticationException
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

function isRetryableEsClientError(e: Error): boolean {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError && retryResponseStatuses.includes(e?.statusCode!))
  ) {
    return true;
  }
  return false;
}

export function retryEs<R>(fn: () => Promise<R>) {
  return pRetry(fn, {
    retries: 3,
    onFailedAttempt: (error) => {
      if (!isRetryableEsClientError(error)) {
        throw error;
      }
    },
  });
}
