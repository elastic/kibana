/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type IHttpFetchError, isHttpFetchError } from '@kbn/core-http-browser';

const RATE_LIMITER_POLICY = 'elu';

export function isRateLimiterError(error: unknown): error is IHttpFetchError {
  return !!(
    isHttpFetchError(error) &&
    error.response?.status === 429 &&
    error.response.headers
      .get('RateLimit')
      ?.split(';')
      .map((chunk) => chunk.replace(/^['"]?(.*?)['"]?$/, '$1'))
      .includes(RATE_LIMITER_POLICY)
  );
}

export function getRetryAfter(error: IHttpFetchError): number {
  const retryAfter = error.response?.headers.get('Retry-After');

  return retryAfter ? parseInt(retryAfter, 10) : 0;
}
