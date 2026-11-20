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

export interface WrapKibanaSupertestAgentOptions {
  /** Total time budget for ELU 429 retries (default 120s, aligned with FTR `timeouts.try`). */
  maxRetryMs?: number;
}

/** superagent internals we rely on to delay and cancel the built-in resend. */
type RetryableTest = SupertestTest & {
  _retry: () => unknown;
  _maxRetries?: number;
  _aborted?: boolean;
};

const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

/**
 * Uses superagent's own resend (what `.retry()` does) on the same request object, so `.abort()`,
 * `.end(cb)`, `.expect()` and awaiting more than once keep their usual behavior. Only ELU rate
 * limiter 429s are retried, honoring `Retry-After` within `maxRetryMs`.
 */
const retryOnEluRateLimit = (test: SupertestTest, maxRetryMs: number): SupertestTest => {
  const internals = test as RetryableTest;
  const originalRetry = internals._retry;
  let firstLimitedAt: number | undefined;
  let nextDelayMs = 0;

  test.retry(Number.MAX_SAFE_INTEGER, (error, response) => {
    const limited: EluRateLimitResponseLike | undefined =
      response ?? (error as { response?: SupertestResponse } | undefined)?.response;
    if (!isEluRateLimiter429(limited)) {
      return false;
    }

    const delayMs = getEluRateLimiterRetryDelayMs(limited);
    const now = Date.now();
    firstLimitedAt ??= now;
    if (now + delayMs - firstLimitedAt > maxRetryMs) {
      return false;
    }

    nextDelayMs = delayMs;
    return true;
  });

  internals._retry = function delayedRetry() {
    test.clearTimeout();
    setTimeout(() => {
      if (!internals._aborted) {
        originalRetry.call(internals);
      }
    }, nextDelayMs);
    return internals;
  };

  // superagent ignores `abort` while retries remain, which would leave an aborted request unsettled
  test.on('abort', () => {
    internals._maxRetries = 0;
  });

  return test;
};

/** Retries Kibana supertest requests when the ELU HTTP rate limiter returns 429. */
export const wrapKibanaSupertestAgent = <T extends KibanaSupertestAgent>(
  agent: T,
  options: WrapKibanaSupertestAgentOptions = {}
): T => {
  const maxRetryMs = options.maxRetryMs ?? 120_000;
  const requestAgent = agent as SuperTestClient;

  return new Proxy(agent, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && (HTTP_VERBS as readonly string[]).includes(prop)) {
        const verb = prop as (typeof HTTP_VERBS)[number];
        return (url: string) => retryOnEluRateLimit(requestAgent[verb](url), maxRetryMs);
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};
