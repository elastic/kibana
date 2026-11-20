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

interface RecordedRequest {
  verb: (typeof HTTP_VERBS)[number];
  url: string;
  /** Every chained call (`.set()`, `.send()`, `.expect()`, ...), replayed as-is on retry. */
  calls: Array<{ method: string; args: unknown[] }>;
}

const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const replay = (agent: SuperTestClient, { verb, url, calls }: RecordedRequest): SupertestTest =>
  calls.reduce<SupertestTest>(
    (test, { method, args }) =>
      (test as unknown as Record<string, (...a: unknown[]) => SupertestTest>)[method](...args),
    agent[verb](url)
  );

/**
 * Runs the request once. A 429 is surfaced as `{ response }` even when an `.expect()` assertion
 * rejected it, since supertest then reports an assertion error without `error.response`.
 */
const runTestOnce = (test: SupertestTest) =>
  new Promise<{ response?: SupertestResponse; error?: unknown }>((resolve) => {
    test.end((error, response) => resolve({ response, error }));
  });

const runWithEluRetries = async (
  agent: SuperTestClient,
  firstTest: SupertestTest,
  request: RecordedRequest,
  maxRetryMs: number
): Promise<SupertestResponse> => {
  const deadline = Date.now() + maxRetryMs;
  let test = firstTest;

  while (true) {
    const { response, error } = await runTestOnce(test);
    const errorResponse = (error as { response?: EluRateLimitResponseLike } | undefined)?.response;
    const limited = response ?? errorResponse;

    if (!isEluRateLimiter429(limited)) {
      if (error) {
        throw error;
      }
      return response as SupertestResponse;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      if (error) {
        throw error;
      }
      return response as SupertestResponse;
    }

    await sleep(Math.min(getEluRateLimiterRetryDelayMs(limited), remaining));
    test = replay(agent, request);
  }
};

const wrapTest = (
  agent: SuperTestClient,
  test: SupertestTest,
  request: RecordedRequest,
  maxRetryMs: number
): SupertestTest =>
  new Proxy(test, {
    get(target, prop, receiver) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const settled = () => runWithEluRetries(agent, target, request, maxRetryMs);
        return (...handlers: Array<(arg?: never) => unknown>) =>
          (settled() as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...handlers);
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || typeof prop !== 'string') {
        return value;
      }

      return (...args: unknown[]) => {
        const result = value.apply(target, args);
        // chainable calls return the same Test; anything else (e.g. `.end()`) passes through
        if (result !== target) {
          return result;
        }
        request.calls.push({ method: prop, args });
        return receiver as SupertestTest;
      };
    },
  });

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
        return (url: string) =>
          wrapTest(requestAgent, requestAgent[verb](url), { verb, url, calls: [] }, maxRetryMs);
      }

      return Reflect.get(target, prop, receiver);
    },
  });
};
