/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExpectMatcherState, MatcherReturnType } from '@playwright/test';

export interface ToHaveStatusCodeOptions {
  /** Match if the status code is one of these values */
  oneOf: number[];
  // Future: range?: [number, number];
}

/**
 * Custom matcher for expect.extend(): asserts the response has the expected HTTP status code.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).toHaveStatusCode({ oneOf: [200, 201] });
 * expect(response).not.toHaveStatusCode(404);
 */
export function toHaveStatusCode(
  this: ExpectMatcherState,
  received: unknown,
  expected: number | ToHaveStatusCodeOptions
): MatcherReturnType {
  if (
    typeof received !== 'object' ||
    received === null ||
    (!('status' in received) && !('statusCode' in received))
  ) {
    const expectedValue = typeof expected === 'number' ? expected : expected.oneOf;
    return {
      pass: this.isNot,
      message: () =>
        this.utils.matcherHint('toHaveStatusCode', undefined, undefined, { isNot: this.isNot }) +
        '\n\n' +
        `Expected object with ${this.utils.printExpected({
          status: expectedValue,
        })} or ${this.utils.printExpected({ statusCode: expectedValue })}\n` +
        `Received: ${this.utils.printReceived(received)}`,
    };
  }

  const actual = 'status' in received ? received.status : received.statusCode;
  const codes = typeof expected === 'number' ? [expected] : expected.oneOf;
  const pass = codes.includes(actual as number);

  return {
    pass,
    message: () =>
      this.utils.matcherHint('toHaveStatusCode', undefined, undefined, { isNot: this.isNot }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(expected)}\n` +
      `Received: ${this.utils.printReceived(actual)}`,
    name: 'toHaveStatusCode',
    expected,
    actual,
  };
}
