/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { AsymmetricMatcher, AsymmetricMatchers } from './types';

// Symbol used by Jest/Playwright to identify asymmetric matchers
const ASYMMETRIC_MATCHER_SYMBOL = Symbol.for('jest.asymmetricMatcher');

/**
 * Creates a custom asymmetric matcher that can be used inside toMatchObject().
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
 * Asymmetric matchers that allow partial, flexible, or pattern-based assertions
 * inside objects or arrays without requiring an exact value match
 *
 * @example
 * expect({ count: 5 }).toMatchObject({ count: expect.toBeGreaterThan(0) });
 */
export const asymmetricMatchers: AsymmetricMatchers = {
  /** Ensures that `value > expected` for number values */
  toBeGreaterThan: (min: number) =>
    createAsymmetricMatcher(
      (actual) => typeof actual === 'number' && actual > min,
      `toBeGreaterThan(${min})`
    ),

  /** Ensures that `value < expected` for number values */
  toBeLessThan: (max: number) =>
    createAsymmetricMatcher(
      (actual) => typeof actual === 'number' && actual < max,
      `toBeLessThan(${max})`
    ),

  /** Matches an array that contains all of the elements in the expected array, in any order */
  arrayContaining: <T>(expected: T[]) => baseExpect.arrayContaining(expected),

  /** Matches an object that contains and matches all of the properties in the expected object */
  objectContaining: <T extends Record<string, unknown>>(expected: T) =>
    baseExpect.objectContaining(expected),
};
