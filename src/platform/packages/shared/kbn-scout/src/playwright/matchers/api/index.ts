/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { ExpectOptionsOrMessage, Matchers } from './types';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import { toHaveHeaders } from './to_have_headers';
import { asymmetricMatchers } from './asymmetric_matchers';

// Register custom response matchers natively on Playwright's expect
const extendedExpect = baseExpect.extend({ toHaveStatusCode, toHaveStatusText, toHaveHeaders });

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

/**
 * Properties that are structural (not matchers) and should always be allowed through.
 */
const structuralProps = new Set(['not', 'rejects', 'resolves', 'then', 'toJSON']);

/**
 * Creates a restricting Proxy around a Playwright expect result.
 * Allows only matchers in the allowedMatchers set, blocking everything else at runtime.
 * Since the real Playwright Proxy is underneath, test step locations in the HTML report
 * will correctly point to the test file instead of internal matcher files.
 */
function restrictMatchers(playwrightExpectResult: object): Matchers {
  return new Proxy(playwrightExpectResult, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }
      if (structuralProps.has(prop)) {
        const value = Reflect.get(target, prop, receiver);
        // Wrap nested objects (like .not, .rejects) with the same restriction
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
      return Reflect.get(target, prop, receiver);
    },
  }) as Matchers;
}

/**
 * Custom expect wrapper for API tests with generic and response matchers.
 * Uses a restricting Proxy over Playwright's native expect to ensure correct
 * test step locations in the HTML report while controlling the matcher surface.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).toMatchObject({ body: { count: expect.toBeGreaterThan(0) } });
 * expect(value, 'Custom error message').toBeDefined();
 * expect(toolCalls.length).toBeGreaterThanOrEqual(1);
 */
function expectFn(actual: unknown, options?: ExpectOptionsOrMessage): Matchers {
  const message = typeof options === 'string' ? options : options?.message;
  // eslint-disable-next-line playwright/valid-expect
  const expectInstance = extendedExpect(actual, message ? { message } : undefined);
  return restrictMatchers(expectInstance);
}

export const expect = Object.assign(expectFn, asymmetricMatchers);
