/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';

const DEFAULT_RETRY_STATUS_CODES = [
  408, // RequestTimeout
  410, // Gone
  429, // TooManyRequests -> ES circuit breaker
  503, // ServiceUnavailable
  504, // GatewayTimeout
];

/**
 * Returns true if the given elasticsearch error should be retried
 *
 * Retryable errors include:
 * - NoLivingConnectionsError
 * - ConnectionError
 * - TimeoutError
 * - ResponseError with status codes:
 *   - 408 RequestTimeout
 *   - 410 Gone
 *   - 429 TooManyRequests (ES circuit breaker)
 *   - 503 ServiceUnavailable
 *   - 504 GatewayTimeout
 *   - OR custom status codes if provided
 * @param e The error to check
 * @param customRetryStatusCodes Custom response status codes to consider as retryable
 * @returns true if the error is retryable, false otherwise
 */
export const isRetryableEsClientError = (
  e: EsErrors.ElasticsearchClientError,
  customRetryStatusCodes?: number[]
): boolean => {
  if (
    e instanceof EsErrors.NoLivingConnectionsError ||
    e instanceof EsErrors.ConnectionError ||
    e instanceof EsErrors.TimeoutError ||
    (e instanceof EsErrors.ResponseError &&
      (customRetryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES).includes(e?.statusCode!))
  ) {
    return true;
  }
  return false;
};
