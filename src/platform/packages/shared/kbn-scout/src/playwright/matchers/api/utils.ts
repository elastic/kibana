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
  skipStackLines?: number;
}

/**
 * Format error messages for API matchers like Playwright.
 */
export function createMatcherError(options: MatcherErrorOptions): Error {
  const { expected, matcherName, received, isNegated = false, skipStackLines = 0 } = options;
  const gray = '\x1b[90m';
  const red = '\x1b[31m';
  const green = '\x1b[32m';
  const reset = '\x1b[0m';

  // Gray for syntax, red for received, green for expected, matcherName in default (white)
  const matcherCall =
    `${gray}expect(${red}received${gray}).${reset}` +
    `${matcherName}` +
    `${gray}(${green}expected${gray})${reset}`;

  const error = new Error(
    `${matcherCall}\n\n` +
      `Expected: ${isNegated ? 'not ' : ''}${green}${expected}${reset}\n` +
      `Received: ${red}${received}${reset}`
  );

  if (skipStackLines > 0 && error.stack) {
    const lines = error.stack.split('\n');
    // First line is the error message, rest are stack frames
    const messageLines = lines.filter((line) => !line.trimStart().startsWith('at '));
    const stackLines = lines.filter((line) => line.trimStart().startsWith('at '));
    error.stack = [...messageLines, ...stackLines.slice(skipStackLines)].join('\n');
  }

  return error;
}
