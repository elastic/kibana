/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, ESE_API_PATH, SESSION_API_PATH } from './constants';

export const randomSessionId = () => `my-session-${Math.random()}`;

export const randomHash = () =>
  Array.from({ length: 64 }, () =>
    'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26))
  ).join('');

/**
 * Submits an async search under `sessionId` and returns the Elasticsearch async search id.
 * `wait_for_completion_timeout: '1ms'` guarantees the search is still running when it returns.
 * Callers compose `headers` from `COMMON_HEADERS` plus any auth cookie they need.
 */
export const submitSearch = async (
  apiClient: ApiClientFixture,
  sessionId: string,
  headers: Record<string, string>,
  {
    isStored,
    query = { match_all: {} },
  }: { isStored?: boolean; query?: Record<string, unknown> } = {}
): Promise<string> => {
  const response = await apiClient.post(ESE_API_PATH, {
    headers: { ...COMMON_HEADERS, ...headers },
    body: {
      sessionId,
      ...(isStored ? { isStored: true } : {}),
      params: {
        body: { query },
        wait_for_completion_timeout: '1ms',
      },
      requestHash: randomHash(),
    },
  });
  expect(response).toHaveStatusCode(200);
  return response.body.id;
};

/** Saves a search session so its linked ES searches get extended keep-alives. */
export const saveSession = async (
  apiClient: ApiClientFixture,
  sessionId: string,
  headers: Record<string, string>
): Promise<void> => {
  const response = await apiClient.post(SESSION_API_PATH, {
    headers: { ...COMMON_HEADERS, ...headers },
    body: {
      sessionId,
      name: 'My Session',
      appId: 'discover',
      expires: '123',
      locatorId: 'discover',
    },
  });
  expect(response).toHaveStatusCode(200);
};

/**
 * Polls a callback until it returns the expected value or the timeout is reached.
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  expected: T,
  opts: { timeout?: number; interval?: number } = {}
) {
  const { timeout = 15_000, interval = 2_000 } = opts;
  const start = Date.now();
  let lastValue: T;
  while (Date.now() - start < timeout) {
    lastValue = await fn();
    if (lastValue === expected) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitFor timed out after ${timeout}ms. Last value: ${String(lastValue!)}`);
}
