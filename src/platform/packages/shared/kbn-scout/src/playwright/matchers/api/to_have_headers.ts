/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpectMatcherState, MatcherReturnType } from '@playwright/test';

/**
 * Custom matcher for expect.extend(): asserts the response contains the expected headers.
 * This is a partial match - the response can contain additional headers.
 * Header keys are case-insensitive.
 *
 * @example
 * expect(response).toHaveHeaders({ 'content-type': 'application/json' });
 * expect(response).not.toHaveHeaders({ 'x-forbidden': 'value' });
 */
export function toHaveHeaders(
  this: ExpectMatcherState,
  received: unknown,
  expectedHeaders: Record<string, string>
): MatcherReturnType {
  if (typeof received !== 'object' || received === null || !('headers' in received)) {
    return {
      pass: this.isNot,
      message: () =>
        this.utils.matcherHint('toHaveHeaders', undefined, undefined, { isNot: this.isNot }) +
        '\n\n' +
        `Expected object with ${this.utils.printExpected({ headers: expectedHeaders })}\n` +
        `Received: ${this.utils.printReceived(received)}`,
    };
  }

  const actualHeaders: Record<string, string> = {};
  const headers = received.headers ?? {};
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    actualHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  const normalizedExpected: Record<string, string> = {};
  for (const [key, value] of Object.entries(expectedHeaders)) {
    normalizedExpected[key.toLowerCase()] = value;
  }

  const pass = Object.entries(normalizedExpected).every(
    ([key, value]) => actualHeaders[key] === value
  );

  return {
    pass,
    message: () =>
      this.utils.matcherHint('toHaveHeaders', undefined, undefined, { isNot: this.isNot }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(normalizedExpected)}\n` +
      `Received: ${this.utils.printReceived(actualHeaders)}`,
    name: 'toHaveHeaders',
    expected: normalizedExpected,
    actual: actualHeaders,
  };
}
