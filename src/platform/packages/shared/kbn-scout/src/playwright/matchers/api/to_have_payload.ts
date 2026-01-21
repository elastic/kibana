/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import { createMatcherError } from './utils';

export interface ToHavePayloadOptions {
  exactMatch?: boolean;
}

// Symbol used by Jest/Playwright to identify asymmetric matchers
const ASYMMETRIC_MATCHER_SYMBOL = Symbol.for('jest.asymmetricMatcher');

function isAsymmetricMatcher(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    // eslint-disable-next-line dot-notation
    (value as Record<string | symbol, unknown>)['$$typeof'] === ASYMMETRIC_MATCHER_SYMBOL
  );
}

/**
 * Recursively wraps arrays with `arrayContaining` and objects with `objectContaining`
 * to enable partial matching at any depth. Preserves asymmetric matchers
 * (e.g., `expect.toBeDefined()`, `expect.toBeGreaterThan()`) when encountered.
 */
function toPartialMatch(expected: unknown): unknown {
  if (isAsymmetricMatcher(expected)) {
    return expected;
  }
  if (Array.isArray(expected)) {
    return baseExpect.arrayContaining(expected.map(toPartialMatch));
  }
  if (expected !== null && typeof expected === 'object') {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(expected)) {
      transformed[key] = toPartialMatch(value);
    }
    return baseExpect.objectContaining(transformed);
  }
  return expected;
}

/**
 * Asserts that the response payload matches the expected value.
 *
 * @param expected - The expected value. If omitted, checks that payload is not null/undefined.
 * @param options.exactMatch - If true, performs exact matching for objects/arrays.
 *
 * @example
 * // Basic usage
 * expect(response).toHavePayload();                                   // checks payload is not null/undefined
 * expect(response).toHavePayload({ id: 1 });                          // partial match (default)
 * expect(response).toHavePayload({ id: 1 }, { exactMatch: true });    // exact match
 * expect(response).toHavePayload('success');                          // exact match for primitives
 * expect(response).toHavePayload({ items: [{ name: 'foo' }] });       // at least one item with name 'foo'
 *
 * // With asymmetric matchers for flexible assertions
 * expect(response).toHavePayload({ metadata: expect.toBeDefined() });
 * expect(response).toHavePayload({ count: expect.toBeGreaterThan(0) });
 * expect(response).toHavePayload({ comments: expect.toHaveLength(3) });
 */
export function toHavePayload<T extends { data: unknown } | { body: unknown }>(
  obj: T,
  expected?: unknown,
  options?: ToHavePayloadOptions,
  isNegated = false
): void {
  const actual = 'data' in obj ? obj.data : obj.body;

  if (expected === undefined) {
    const hasValue = actual !== null && actual !== undefined;
    if ((!hasValue && !isNegated) || (hasValue && isNegated)) {
      throw createMatcherError('defined', 'toHavePayload', actual, isNegated);
    }
    return;
  }

  const exactMatch = options?.exactMatch ?? false;
  const isObject =
    expected !== null &&
    typeof expected === 'object' &&
    actual !== null &&
    typeof actual === 'object';

  try {
    // eslint-disable-next-line playwright/valid-expect
    const assertion = isNegated ? baseExpect(actual).not : baseExpect(actual);
    if (isObject && !exactMatch) {
      const transformedExpected = toPartialMatch(expected);
      assertion.toEqual(transformedExpected);
    } else {
      assertion.toEqual(expected);
    }
  } catch {
    const actualDisplay = typeof actual === 'object' ? JSON.stringify(actual) : actual;
    const expectedDisplay = typeof expected === 'object' ? JSON.stringify(expected) : expected;
    throw createMatcherError(expectedDisplay, 'toHavePayload', actualDisplay, isNegated);
  }
}
