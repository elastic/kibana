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

type SupertestTestInternals = SupertestTest & {
  header?: Record<string, string | string[] | undefined>;
  qs?: Record<string, unknown>;
  _data?: string | object;
  _asserts?: Array<(res: SupertestResponse) => SupertestTest>;
};

export interface WrapKibanaSupertestAgentOptions {
  /** Total time budget for ELU 429 retries (default 120s, aligned with FTR `timeouts.try`). */
  maxRetryMs?: number;
}

interface RequestSnapshot {
  method: string;
  path: string;
  query: Record<string, unknown> | undefined;
  headers: Record<string, string | string[] | undefined>;
  data: string | object | undefined;
  asserts: Array<(res: SupertestResponse) => SupertestTest>;
}

const HTTP_VERBS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

const HEADERS_TO_OMIT_ON_REBUILD = new Set(['content-length', 'host', 'transfer-encoding']);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const asTestInternals = (test: SupertestTest): SupertestTestInternals =>
  test as SupertestTestInternals;

const snapshotFromTest = (test: SupertestTest): RequestSnapshot => {
  const internals = asTestInternals(test);
  const url = new URL(test.url);

  const query =
    internals.qs && Object.keys(internals.qs).length > 0 ? { ...internals.qs } : undefined;

  return {
    method: test.method.toLowerCase(),
    path: `${url.pathname}${url.search}`,
    query,
    headers: { ...(internals.header ?? {}) },
    data: internals._data,
    asserts: [...(internals._asserts ?? [])],
  };
};

const rebuildTest = (agent: SuperTestClient, snapshot: RequestSnapshot): SupertestTest => {
  const verb = snapshot.method as (typeof HTTP_VERBS)[number];
  if (!HTTP_VERBS.includes(verb)) {
    throw new Error(`Unsupported HTTP method for ELU retry: ${snapshot.method}`);
  }

  let request = agent[verb](snapshot.path);

  if (snapshot.query) {
    request = request.query(snapshot.query);
  }

  for (const [key, value] of Object.entries(snapshot.headers)) {
    if (value === undefined || HEADERS_TO_OMIT_ON_REBUILD.has(key.toLowerCase())) {
      continue;
    }
    request = request.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  if (snapshot.data !== undefined) {
    request = request.send(snapshot.data);
  }

  if (snapshot.asserts.length) {
    const internals = asTestInternals(request);
    internals._asserts ??= [];
    internals._asserts.push(...snapshot.asserts);
  }

  return request;
};

const runTestOnce = (test: SupertestTest) =>
  new Promise<SupertestResponse>((resolve, reject) => {
    test.end((err, res) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(res);
    });
  });

const getErrorResponse = (error: unknown): EluRateLimitResponseLike | undefined =>
  (error as { response?: EluRateLimitResponseLike })?.response;

const runWithEluRetries = async (
  agent: SuperTestClient,
  snapshot: RequestSnapshot,
  maxRetryMs: number
) => {
  const deadline = Date.now() + maxRetryMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await runTestOnce(rebuildTest(agent, snapshot));
    } catch (error) {
      lastError = error;
      const response = getErrorResponse(error);
      if (!isEluRateLimiter429(response)) {
        throw error;
      }

      const delay = getEluRateLimiterRetryDelayMs(response);
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        break;
      }
      await sleep(Math.min(delay, remaining));
    }
  }

  throw lastError;
};

const wrapTest = (
  agent: SuperTestClient,
  initialTest: SupertestTest,
  maxRetryMs: number
): SupertestTest => {
  const state = { test: initialTest };

  const handler: ProxyHandler<SupertestTest> = {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return (
          onFulfilled?: (value: SupertestResponse) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) => {
          const snapshot = snapshotFromTest(state.test);
          return runWithEluRetries(agent, snapshot, maxRetryMs).then(onFulfilled, onRejected);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          state.test = value.apply(state.test, args);
          return wrapTest(agent, state.test, maxRetryMs);
        };
      }

      return value;
    },
  };

  return new Proxy(initialTest, handler);
};

const wrapVerb =
  (agent: SuperTestClient, verb: (typeof HTTP_VERBS)[number], maxRetryMs: number) =>
  (url: string) =>
    wrapTest(agent, agent[verb](url), maxRetryMs);

/** Retries Kibana supertest requests when the ELU HTTP rate limiter returns 429. */
export const wrapKibanaSupertestAgent = <T extends KibanaSupertestAgent>(
  agent: T,
  options: WrapKibanaSupertestAgentOptions = {}
): T => {
  const maxRetryMs = options.maxRetryMs ?? 120_000;
  const requestAgent = agent as SuperTestClient;

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && (HTTP_VERBS as readonly string[]).includes(prop)) {
        return wrapVerb(requestAgent, prop as (typeof HTTP_VERBS)[number], maxRetryMs);
      }

      return Reflect.get(target, prop, receiver);
    },
  };

  return new Proxy(agent, handler);
};
