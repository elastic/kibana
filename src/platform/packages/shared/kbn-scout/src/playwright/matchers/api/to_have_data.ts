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

export interface ToHaveDataOptions {
  exactMatch?: boolean;
}

/**
 * Asserts that the response data matches the expected value.
 *
 * @param expected - The expected value. If omitted, checks that data is not null/undefined.
 * @param options.exactMatch - If true, performs exact matching for objects/arrays.
 *
 * @example
 * expect(response).toHaveData(); // checks data is not null/undefined
 * expect(response).toHaveData({ id: 1 }); // partial match (default)
 * expect(response).toHaveData({ id: 1 }, { exactMatch: true }); // exact match
 * expect(response).toHaveData('success'); // exact match for primitives
 */
export function toHaveData<T extends { data: unknown }>(
  obj: T,
  expected?: unknown,
  options?: ToHaveDataOptions,
  isNegated = false
): void {
  const actual = obj.data;

  if (expected === undefined) {
    const hasValue = actual !== null && actual !== undefined;
    if ((!hasValue && !isNegated) || (hasValue && isNegated)) {
      throw createMatcherError('defined', 'toHaveData', actual, isNegated);
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
      assertion.toMatchObject(expected as Record<string, unknown>);
    } else {
      assertion.toEqual(expected);
    }
  } catch {
    const actualDisplay = typeof actual === 'object' ? JSON.stringify(actual) : actual;
    const expectedDisplay = typeof expected === 'object' ? JSON.stringify(expected) : expected;
    throw createMatcherError(expectedDisplay, 'toHaveData', actualDisplay, isNegated);
  }
}
