/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import { toHaveData } from './to_have_data';
import { toHaveHeaders } from './to_have_headers';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import type { MatchersFor, ValueMatchers } from './types';
import type { ToHaveDataOptions } from './to_have_data';

/**
 * Create dynamic matchers based on object keys
 */
function createDynamicMatchers(
  obj: Record<string, unknown>
): Record<string, unknown> & { not: Record<string, unknown> } {
  const matchers: Record<string, unknown> = {};
  const not: Record<string, unknown> = {};

  if ('status' in obj) {
    matchers.toHaveStatusCode = (code: number) => toHaveStatusCode(obj, code);
    not.toHaveStatusCode = (code: number) => toHaveStatusCode(obj, code, true);
  }
  if ('statusText' in obj) {
    matchers.toHaveStatusText = (text: string) => toHaveStatusText(obj, text);
    not.toHaveStatusText = (text: string) => toHaveStatusText(obj, text, true);
  }
  if ('headers' in obj) {
    matchers.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers);
    not.toHaveHeaders = (headers: Record<string, string>) => toHaveHeaders(obj, headers, true);
  }
  if ('data' in obj) {
    matchers.toHaveData = (expected?: unknown, options?: ToHaveDataOptions) =>
      toHaveData(obj, expected, options);
    not.toHaveData = (expected?: unknown, options?: ToHaveDataOptions) =>
      toHaveData(obj, expected, options, true);
  }

  return { ...matchers, not };
}

/**
 * Create value matchers delegating to Playwright expect
 */
function createValueMatchers(actual: unknown): ValueMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const base = baseExpect(actual);
  return {
    toBe: (expected) => base.toBe(expected),
    toEqual: (expected) => base.toEqual(expected),
    toStrictEqual: (expected) => base.toStrictEqual(expected),
    toContain: (expected) => base.toContain(expected),
    toBeDefined: () => base.toBeDefined(),
    toBeUndefined: () => base.toBeUndefined(),
    toHaveLength: (expected) => base.toHaveLength(expected),
    toBeGreaterThan: (expected) => base.toBeGreaterThan(expected),
    toBeGreaterThanOrEqual: (expected) => base.toBeGreaterThanOrEqual(expected),
    toBeLessThan: (expected) => base.toBeLessThan(expected),
    toBeLessThanOrEqual: (expected) => base.toBeLessThanOrEqual(expected),
    toHaveProperty: (keyPath, value?) =>
      value !== undefined ? base.toHaveProperty(keyPath, value) : base.toHaveProperty(keyPath),
    not: {
      toBe: (expected) => base.not.toBe(expected),
      toEqual: (expected) => base.not.toEqual(expected),
      toStrictEqual: (expected) => base.not.toStrictEqual(expected),
      toContain: (expected) => base.not.toContain(expected),
      toBeDefined: () => base.not.toBeDefined(),
      toBeUndefined: () => base.not.toBeUndefined(),
      toHaveLength: (expected) => base.not.toHaveLength(expected),
      toBeGreaterThan: (expected) => base.not.toBeGreaterThan(expected),
      toBeGreaterThanOrEqual: (expected) => base.not.toBeGreaterThanOrEqual(expected),
      toBeLessThan: (expected) => base.not.toBeLessThan(expected),
      toBeLessThanOrEqual: (expected) => base.not.toBeLessThanOrEqual(expected),
      toHaveProperty: (keyPath, value?) =>
        value !== undefined
          ? base.not.toHaveProperty(keyPath, value)
          : base.not.toHaveProperty(keyPath),
    },
  };
}

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
    const dynamicMatchers = createDynamicMatchers(actual as Record<string, unknown>);
    return {
      ...valueMatchers,
      ...dynamicMatchers,
      not: { ...valueMatchers.not, ...dynamicMatchers.not },
    };
  }

  return valueMatchers;
}
