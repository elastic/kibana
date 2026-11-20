/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type supertest from 'supertest';
import type { Response as SupertestResponse, Test as SupertestTest } from 'supertest';
import {
  getEluRateLimiterRetryDelayMs,
  isEluRateLimiter429,
  type EluRateLimitResponseLike,
} from './is_elu_rate_limiter_429';

/** Any supertest client returned by `supertest()` / `supertest.agent()`. */
export type KibanaSupertestAgent = ReturnType<typeof supertest>;

type SuperTestClient = supertest.SuperTest<SupertestTest>;

export interface EluRetryInfo {
  method: string;
  url: string;
  attempt: number;
  delayMs: number;
}

export interface WrapKibanaSupertestAgentOptions {
  /** Total time budget for ELU 429 retries (default 120s, aligned with FTR `timeouts.try`). */
  maxRetryMs?: number;
  /** Called before each ELU 429 retry, so runs can show that the retry path was exercised. */
  onRetry?: (info: EluRetryInfo) => void;
}

/** superagent internals we rely on to delay and cancel the built-in resend. */
type RetryableTest = SupertestTest & {
  _retry: () => unknown;
  _end: () => unknown;
  _maxRetries?: number;
  _aborted?: boolean;
  /** the caller's `.timeout()` deadline in ms */
  _timeout?: number;
  /** set by `.attach()` / `.field()`; the stream is consumed by the first attempt */
  _formData?: unknown;
};

const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

/**
 * Uses superagent's own resend (what `.retry()` does) on the same request object, so `.abort()`,
 * `.end(cb)`, `.expect()` and awaiting more than once keep their usual behavior. Only ELU rate
 * limiter 429s are retried, honoring `Retry-After` within `maxRetryMs`.
 */
const retryOnEluRateLimit = (
  test: SupertestTest,
  {
    maxRetryMs,
    onRetry,
  }: Required<Pick<WrapKibanaSupertestAgentOptions, 'maxRetryMs'>> &
    Pick<WrapKibanaSupertestAgentOptions, 'onRetry'>
): SupertestTest => {
  const internals = test as RetryableTest;
  const originalRetry = internals._retry;
  const originalEnd = internals._end;
  let callerTimeoutMs: number | undefined;
  let startedAt: number | undefined;
  let firstLimitedAt: number | undefined;
  let attempt = 0;
  let nextDelayMs = 0;
  let timer: NodeJS.Timeout | undefined;

  internals._end = function trackedEnd() {
    startedAt ??= Date.now();
    // read here, after the caller chained `.timeout()`, and before a resend rewrites it
    callerTimeoutMs ??= internals._timeout;
    return originalEnd.call(internals);
  };

  test.retry(Number.MAX_SAFE_INTEGER, (error, response) => {
    const limited: EluRateLimitResponseLike | undefined =
      response ?? (error as { response?: SupertestResponse } | undefined)?.response;
    if (!isEluRateLimiter429(limited)) {
      return false;
    }

    // multipart bodies are streams consumed by the first attempt, leave the 429 visible
    if (internals._formData) {
      return false;
    }

    const delayMs = getEluRateLimiterRetryDelayMs(limited);
    const now = Date.now();
    firstLimitedAt ??= now;
    if (now + delayMs - firstLimitedAt > maxRetryMs) {
      return false;
    }
    // the resend must not outlive the caller's own `.timeout()`
    if (callerTimeoutMs && now + delayMs - (startedAt ?? now) >= callerTimeoutMs) {
      return false;
    }

    nextDelayMs = delayMs;
    attempt++;
    onRetry?.({ method: test.method, url: test.url, attempt, delayMs });
    return true;
  });

  internals._retry = function delayedRetry() {
    test.clearTimeout();
    timer = setTimeout(() => {
      if (internals._aborted) {
        return;
      }
      if (callerTimeoutMs) {
        internals._timeout = Math.max(1, callerTimeoutMs - (Date.now() - (startedAt ?? 0)));
      }
      originalRetry.call(internals);
    }, nextDelayMs);
    return internals;
  };

  // superagent ignores `abort` while retries remain, which would leave an aborted request unsettled
  test.on('abort', () => {
    internals._maxRetries = 0;
    clearTimeout(timer);
  });

  return test;
};

/** Retries Kibana supertest requests when the ELU HTTP rate limiter returns 429. */
export const wrapKibanaSupertestAgent = <T extends KibanaSupertestAgent>(
  agent: T,
  options: WrapKibanaSupertestAgentOptions = {}
): T => {
  const retryOptions = { maxRetryMs: options.maxRetryMs ?? 120_000, onRetry: options.onRetry };
  const requestAgent = agent as SuperTestClient;

  return new Proxy(agent, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && (HTTP_VERBS as readonly string[]).includes(prop)) {
        const verb = prop as (typeof HTTP_VERBS)[number];
        return (url: string) => retryOnEluRateLimit(requestAgent[verb](url), retryOptions);
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};
