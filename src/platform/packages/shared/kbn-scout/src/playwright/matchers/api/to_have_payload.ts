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
 * Internal implementation for payload matching.
 */
function toHavePayloadInternal(
  actual: unknown,
  matcherName: string,
  expected?: unknown,
  options?: ToHavePayloadOptions,
  isNegated = false
): void {
  if (expected === undefined) {
    const hasValue = actual !== null && actual !== undefined;
    if ((!hasValue && !isNegated) || (hasValue && isNegated)) {
      throw createMatcherError({
        expected: 'defined',
        matcherName,
        received: actual,
        isNegated,
      });
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
    throw createMatcherError({
      expected: expectedDisplay,
      matcherName,
      received: actualDisplay,
      isNegated,
    });
  }
}

/**
 * Asserts that response.data matches the expected value.
 * Used with kbnClient/apiServices responses.
 *
 * @param expected - The expected value. If omitted, checks that data is not null/undefined.
 * @param options.exactMatch - If true, performs exact matching for objects/arrays.
 *
 * @example
 * const response = await apiServices.dataViews.get(id);
 * expect(response).toHaveData({ version: expect.toBeDefined(), items: [{ id: itemId }] });
 */
export function toHaveData<T extends { data: unknown }>(
  obj: T,
  expected?: unknown,
  options?: ToHavePayloadOptions,
  isNegated = false
): void {
  toHavePayloadInternal(obj.data, 'toHaveData', expected, options, isNegated);
}

/**
 * Asserts that response.body matches the expected value.
 * Used with apiClient responses.
 *
 * @param expected - The expected value. If omitted, checks that body is not null/undefined.
 * @param options.exactMatch - If true, performs exact matching for objects/arrays.
 *
 * @example
 * const response = await apiClient.get('api/cases');
 * expect(response).toHaveBody({ version: expect.toBeDefined(), cases: [{ id: caseId }] });
 */
export function toHaveBody<T extends { body: unknown }>(
  obj: T,
  expected?: unknown,
  options?: ToHavePayloadOptions,
  isNegated = false
): void {
  toHavePayloadInternal(obj.body, 'toHaveBody', expected, options, isNegated);
}
