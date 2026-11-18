/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { timers } from './client';
import { SentinelOne } from './sentinelone';

export const CONSOLE = 'https://tenant.sentinelone.net';
export const API = `${CONSOLE}/web/api/v2.1`;
export const TOKEN = 'unit-test-token';
export const AUTH = { Authorization: `ApiToken ${TOKEN}`, token: false };

export const request = jest.fn();
export const ctx = {
  client: { request },
  config: { url: CONSOLE },
  secrets: { authType: 'api_key_header', token: TOKEN },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

export const run = (name: string, input: Record<string, unknown>) => {
  const action = SentinelOne.actions[name];
  return action.handler(ctx, action.input.parse(input));
};

/** Builds objects whose keys are SentinelOne filter names such as createdAt__gte. */
export const vendorParams = (entries: Array<[string, unknown]>) => Object.fromEntries(entries);

export const listBody = (data: unknown[] = [], nextCursor: string | null = null) => ({
  data,
  pagination: { nextCursor, totalItems: data.length },
});

export const httpError = (
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {}
) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

/** Resets the request mock and stubs the poll sleep before each test, and restores every spy after it. */
export const resetMocksAroundEachTest = () => {
  beforeEach(() => {
    request.mockReset();
    jest.spyOn(timers, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
};

/** One request-shape row: action name, input, then the exact request it must send. */
export type RequestCase = [
  string,
  Record<string, unknown>,
  { method: string; path: string; params?: object; data?: unknown }
];

/** Checks that one action sends exactly the documented request and nothing else. */
export const expectDocumentedRequest = async (
  name: RequestCase[0],
  input: RequestCase[1],
  expected: RequestCase[2]
) => {
  request.mockResolvedValue({ status: 200, data: { data: { affected: 1 } } });
  await run(name, input);
  expect(request).toHaveBeenCalledTimes(1);
  const sent = request.mock.calls[0][0];
  expect(sent.method).toBe(expected.method);
  expect(sent.url).toBe(`${API}${expected.path}`);
  expect(sent.headers).toEqual(AUTH);
  expect(sent.params).toEqual(expected.params ?? {});
  if (expected.data !== undefined) {
    expect(sent.data).toEqual(expected.data);
  } else {
    expect(sent.data).toBeUndefined();
  }
};
