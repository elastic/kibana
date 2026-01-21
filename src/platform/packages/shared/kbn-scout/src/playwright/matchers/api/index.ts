/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MatchersFor } from './types';
import { createValueMatchers } from './value_matchers';
import { createDynamicMatchers, type DynamicMatchersInput } from './dynamic_matchers';
import { asymmetricMatchers } from './asymmetric_matchers';

/**
 * Custom expect wrapper with dynamic matchers based on input properties.
 *
 * @example
 * const response = await apiClient.get('api/items');
 * expect(response).toHaveStatusCode(200);
 * expect(response).toHaveBody({ id: 1 });
 *
 * // Asymmetric matchers for flexible assertions
 * expect(response).toHaveBody({ count: expect.toBeGreaterThan(0) });
 */
function expectFn<T>(actual: T): MatchersFor<T>;
function expectFn(actual: unknown) {
  const valueMatchers = createValueMatchers(actual);

  if (typeof actual === 'object' && actual !== null) {
    const dynamicMatchers = createDynamicMatchers(actual as DynamicMatchersInput);
    return {
      ...valueMatchers,
      ...dynamicMatchers,
      not: { ...valueMatchers.not, ...dynamicMatchers.not },
    };
  }

  return valueMatchers;
}

export const expect = Object.assign(expectFn, asymmetricMatchers);
