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

/**
 * Custom expect wrapper with dynamic matchers based on input properties.
 *
 * @example
 * const response: { status: number } = await getApiResponse();
 * expect(response).toHaveStatusCode(200);  // ✅ status exists
 * expect(response).toHaveData({ id: 1 });  // ❌ data doesn't exist
 * expect(response.status).toBe(200);       // ✅ value matchers always work
 */
export function expect<T>(actual: T): MatchersFor<T>;
export function expect(actual: unknown) {
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
