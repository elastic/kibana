/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Matchers } from './types';

/**
 * Allowed matcher names that can be accessed through our expect wrapper.
 * Any matcher not in this set will throw a runtime error.
 */
const allowedMatchers = new Set([
  // Generic matchers
  'toBe',
  'toBeDefined',
  'toBeUndefined',
  'toContain',
  'toHaveLength',
  'toStrictEqual',
  'toBeGreaterThan',
  'toBeGreaterThanOrEqual',
  'toBeLessThan',
  'toBeLessThanOrEqual',
  'toMatchObject',
  'toMatch',
  'toBeNull',
  'toBeCloseTo',
  'toBeInstanceOf',
  'toThrow',
  'toThrowError',
  // Custom response matchers
  'toHaveStatusCode',
  'toHaveStatusText',
  'toHaveHeaders',
]);

// Structural props that return nested Playwright objects — wrap with the same restriction
const nestedProps = new Set(['not', 'rejects', 'resolves']);
// Props that must not throw to avoid breaking serializers and await
const safePassthroughProps = new Set(['then', 'toJSON']);

/**
 * Creates a restricting Proxy around a Playwright expect result.
 * Allows only matchers in the allowedMatchers set, blocking everything else at runtime.
 * Since the real Playwright Proxy is underneath, test step locations in the HTML report
 * will correctly point to the test file instead of internal matcher files.
 */
export function restrictMatchers(playwrightExpectResult: object): Matchers {
  return new Proxy(playwrightExpectResult, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      if (safePassthroughProps.has(prop)) {
        return undefined;
      }
      if (nestedProps.has(prop)) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'object' && value !== null) {
          return restrictMatchers(value);
        }
        return value;
      }
      if (!allowedMatchers.has(prop)) {
        throw new Error(
          `Matcher '${prop}' is not available in Scout API tests. ` +
            `See the Scout API matchers README for the list of supported matchers.`
        );
      }
      // Matchers are returned unbound; `this` at call time will be the Proxy, not the target.
      // Safe today because Playwright's matchers use closures, not `this`.
      // If a Playwright upgrade causes unexpected "Matcher 'X' is not available" errors
      // for internal property names, bind the function to target here instead:
      //   return Reflect.get(target, prop, receiver).bind(target);
      return Reflect.get(target, prop, receiver);
    },
  }) as Matchers;
}
