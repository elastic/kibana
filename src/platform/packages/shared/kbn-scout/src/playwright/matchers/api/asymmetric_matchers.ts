/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsymmetricMatcher, AsymmetricMatchers } from './types';

// Symbol used by Jest/Playwright to identify asymmetric matchers
const ASYMMETRIC_MATCHER_SYMBOL = Symbol.for('jest.asymmetricMatcher');

/**
 * Creates a custom asymmetric matcher that can be used inside toHaveData().
 */
function createAsymmetricMatcher(
  matchFn: (actual: unknown) => boolean,
  description: string
): AsymmetricMatcher {
  return {
    $$typeof: ASYMMETRIC_MATCHER_SYMBOL,
    asymmetricMatch: matchFn,
    toString: () => description,
    toAsymmetricMatcher: () => description,
  };
}

/**
 * Asymmetric matchers for flexible value assertions.
 * These can be used inside toHaveData() for partial matching.
 *
 * @example
 * expect(response).toHaveData({ metadata: expect.toBeDefined() });
 * expect(response).toHaveData({ count: expect.toBeGreaterThan(0) });
 */
export const asymmetricMatchers: AsymmetricMatchers = {
  /** Matches any value that is not null or undefined */
  toBeDefined: () =>
    createAsymmetricMatcher((actual) => actual !== null && actual !== undefined, 'toBeDefined()'),

  /** Matches any number greater than the specified value */
  toBeGreaterThan: (min: number) =>
    createAsymmetricMatcher(
      (actual) => typeof actual === 'number' && actual > min,
      `toBeGreaterThan(${min})`
    ),

  /** Matches any array or string with the specified length, or any length > 0 if not specified */
  toHaveLength: (length?: number) =>
    createAsymmetricMatcher(
      (actual) =>
        (Array.isArray(actual) || typeof actual === 'string') &&
        (length === undefined ? actual.length > 0 : actual.length === length),
      length === undefined ? 'toHaveLength(> 0)' : `toHaveLength(${length})`
    ),
};
