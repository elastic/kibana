/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type supertest from 'supertest';
import type { ScoutLogger } from '../../../../common/services/logger';

const RATE_LIMITER_POLICY = 'elu';

// One retry only: `Retry-After` is about the limiter's 30s ELU term, and a second wait would push
// the request past Scout's 60s test timeout, replacing a diagnosable 429 with an opaque timeout.
const MAX_ATTEMPTS = 2;
const MAX_RETRY_AFTER_MS = 40_000;

const isEluRateLimited = (res: supertest.Response): boolean =>
  res.status === 429 &&
  String(res.headers.ratelimit ?? '')
    .split(';')
    .map((directive) => directive.replace(/^['"]?(.*?)['"]?$/, '$1'))
    .includes(RATE_LIMITER_POLICY);

/**
 * Returns how long to wait before re-issuing a request that Kibana's ELU rate limiter rejected, or
 * undefined when the response is not ELU-limited or asks for longer than a test can wait.
 */
export const getEluRetryDelayMs = (res: supertest.Response): number | undefined => {
  if (!isEluRateLimited(res)) {
    return undefined;
  }

  const retryAfterMs = (Number.parseInt(res.headers['retry-after'] ?? '', 10) || 0) * 1000;

  return retryAfterMs <= MAX_RETRY_AFTER_MS ? retryAfterMs : undefined;
};

// Resolves early when the caller aborts, so `signal` still cancels a request promptly instead of
// waiting out `Retry-After` first.
const waitBeforeRetry = (delayMs: number, signal?: AbortSignal): Promise<void> =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(() => resolve(), delayMs);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

/**
 * Issues a request, re-issuing it once if Kibana's ELU rate limiter rejected it with a 429; the
 * limiter rejects at `onPreAuth`, so the handler never ran and there is no side effect to repeat.
 */
export const withEluRetry = async (
  issueRequest: () => PromiseLike<supertest.Response>,
  {
    log,
    requestDescription,
    signal,
  }: { log: ScoutLogger; requestDescription: string; signal?: AbortSignal }
): Promise<supertest.Response> => {
  for (let attempt = 1; ; attempt++) {
    const res = await issueRequest();

    if (res.status !== 429) {
      return res;
    }

    const retryDelayMs = getEluRetryDelayMs(res);
    const willRetry = retryDelayMs !== undefined && attempt < MAX_ATTEMPTS;

    log.warning(
      `apiClient: ${requestDescription} was rate limited, ${
        willRetry ? `retrying in ${retryDelayMs}ms` : 'giving up'
      }. RateLimit: ${res.headers.ratelimit}, Retry-After: ${res.headers['retry-after']}, body: ${
        res.text
      }`
    );

    if (!willRetry) {
      return res;
    }

    await waitBeforeRetry(retryDelayMs, signal);
  }
};
