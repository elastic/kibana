/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface MatcherErrorOptions {
  expected: unknown;
  matcherName: string;
  received: unknown;
  isNegated?: boolean;
  message?: string;
}

/**
 * Format error messages for API matchers like Playwright.
 */
export function createMatcherError(options: MatcherErrorOptions): Error {
  const { expected, matcherName, received, isNegated = false, message } = options;
  const gray = '\x1b[90m';
  const red = '\x1b[31m';
  const green = '\x1b[32m';
  const reset = '\x1b[0m';

  // Gray for syntax, red for received, green for expected, matcherName in default (white)
  const matcherCall =
    `${gray}expect(${red}received${gray}).${reset}` +
    `${matcherName}` +
    `${gray}(${green}expected${gray})${reset}`;

  const errorMessage =
    `${matcherCall}\n\n` +
    `Expected: ${isNegated ? 'not ' : ''}${green}${expected}${reset}\n` +
    `Received: ${red}${received}${reset}`;

  // Prepend custom message if provided (matching Playwright's format)
  return new Error(message ? `${message}\n\n${errorMessage}` : errorMessage);
}

/**
 * Wraps a matcher function to fix the stack trace.
 * When a matcher throws, the error points to internal files instead of the test.
 * This wrapper catches the error and uses Error.captureStackTrace to exclude
 * the wrapper function, making the error point to the actual test file.
 */
export function wrapMatcher<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const wrapper = (...args: TArgs): TReturn => {
    try {
      return fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        Error.captureStackTrace(error, wrapper);
      }
      throw error;
    }
  };
  return wrapper;
}
