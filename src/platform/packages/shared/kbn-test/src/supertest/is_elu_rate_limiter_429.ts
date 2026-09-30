/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ELU_OVERLOAD_MESSAGE = 'Server is overloaded';

export interface EluRateLimitResponseLike {
  status?: number;
  headers?: Record<string, unknown>;
  body?: unknown;
  text?: string;
}

const getHeader = (headers: Record<string, unknown> | undefined, name: string): unknown => {
  if (!headers) {
    return undefined;
  }
  const direct = headers[name];
  if (direct !== undefined) {
    return direct;
  }
  const lower = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lower)?.[1];
};

const responseBodyAsString = (response: EluRateLimitResponseLike): string => {
  if (typeof response.text === 'string') {
    return response.text;
  }
  if (typeof response.body === 'string') {
    return response.body;
  }
  if (Buffer.isBuffer(response.body)) {
    return response.body.toString('utf8');
  }
  return '';
};

/** True when the response is Kibana's ELU HTTP rate limiter (not other 429 sources). */
export const isEluRateLimiter429 = (response: EluRateLimitResponseLike | undefined): boolean => {
  if (!response || response.status !== 429) {
    return false;
  }

  const rateLimitHeader = getHeader(response.headers, 'RateLimit');
  if (typeof rateLimitHeader === 'string' && rateLimitHeader.includes('elu')) {
    return true;
  }

  return responseBodyAsString(response).includes(ELU_OVERLOAD_MESSAGE);
};

export const getEluRateLimiterRetryDelayMs = (response: EluRateLimitResponseLike | undefined) => {
  const retryAfter = getHeader(response?.headers, 'Retry-After');
  const parsed =
    typeof retryAfter === 'string' || typeof retryAfter === 'number' ? Number(retryAfter) : NaN;
  const fromHeader = Number.isFinite(parsed) ? parsed * 1000 : 0;
  return Math.max(fromHeader, 250);
};
