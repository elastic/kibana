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
 * Custom matcher for expect.extend(): asserts the response has the expected status text.
 *
 * @example
 * expect(response).toHaveStatusText('OK');
 * expect(response).not.toHaveStatusText('Not Found');
 */
export function toHaveStatusText(
  this: ExpectMatcherState,
  received: unknown,
  expected: string
): MatcherReturnType {
  if (
    typeof received !== 'object' ||
    received === null ||
    (!('statusText' in received) && !('statusMessage' in received))
  ) {
    return {
      pass: this.isNot,
      message: () =>
        this.utils.matcherHint('toHaveStatusText', undefined, undefined, { isNot: this.isNot }) +
        '\n\n' +
        `Expected object with ${this.utils.printExpected({
          statusText: expected,
        })} or ${this.utils.printExpected({ statusMessage: expected })}\n` +
        `Received: ${this.utils.printReceived(received)}`,
    };
  }

  const actual = 'statusText' in received ? received.statusText : received.statusMessage;
  const pass = actual === expected;

  return {
    pass,
    message: () =>
      this.utils.matcherHint('toHaveStatusText', undefined, undefined, { isNot: this.isNot }) +
      '\n\n' +
      `Expected: ${this.utils.printExpected(expected)}\n` +
      `Received: ${this.utils.printReceived(actual)}`,
    name: 'toHaveStatusText',
    expected,
    actual,
  };
}
