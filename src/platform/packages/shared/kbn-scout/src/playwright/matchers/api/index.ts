/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { ExpectOptionsOrMessage, Matchers, PollMatchers, PollOptions } from './types';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import { toHaveHeaders } from './to_have_headers';
import { asymmetricMatchers } from './asymmetric_matchers';
import { restrictMatchers } from './restrict_matchers';

const extendedExpect = baseExpect.extend({ toHaveStatusCode, toHaveStatusText, toHaveHeaders });

/**
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).toMatchObject({ body: { count: expect.toBeGreaterThan(0) } });
 * expect(value, 'Custom error message').toBeDefined();
 * expect(toolCalls.length).toBeGreaterThanOrEqual(1);
 */
function expectFn(actual: unknown, options?: ExpectOptionsOrMessage): Matchers {
  const message = typeof options === 'string' ? options : options?.message;
  // eslint-disable-next-line playwright/valid-expect
  const expectInstance = extendedExpect(actual, message ? { message } : undefined);
  return restrictMatchers(expectInstance);
}

/**
 * @example
 * await expect.poll(
 *   async () => {
 *     const response = await apiClient.get('/api/status');
 *     return response.status;
 *   },
 *   { timeout: 30_000, intervals: [2_000] }
 * ).toBe(200);
 */
function poll<T>(actual: () => T | Promise<T>, options?: PollOptions): PollMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const pollResult = extendedExpect.poll(actual, options);
  return restrictMatchers(pollResult) as unknown as PollMatchers;
}

export const expect = Object.assign(expectFn, asymmetricMatchers, { poll });
