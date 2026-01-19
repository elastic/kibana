/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { ValueMatchers } from './types';

/**
 * Create value matchers delegating to Playwright expect
 */
export function createValueMatchers(actual: unknown): ValueMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const base = baseExpect(actual);
  return {
    // toBe: (expected) => base.toBe(expected),
    // toEqual: (expected) => base.toEqual(expected),
    // toStrictEqual: (expected) => base.toStrictEqual(expected),
    // toContain: (expected) => base.toContain(expected),
    toBeDefined: () => base.toBeDefined(),
    // toBeUndefined: () => base.toBeUndefined(),
    // toHaveLength: (expected) => base.toHaveLength(expected),
    // toBeGreaterThan: (expected) => base.toBeGreaterThan(expected),
    // toBeGreaterThanOrEqual: (expected) => base.toBeGreaterThanOrEqual(expected),
    // toBeLessThan: (expected) => base.toBeLessThan(expected),
    // toBeLessThanOrEqual: (expected) => base.toBeLessThanOrEqual(expected),
    // toHaveProperty: (keyPath, value?) =>
    //   value !== undefined ? base.toHaveProperty(keyPath, value) : base.toHaveProperty(keyPath),
    not: {
      // toBe: (expected) => base.not.toBe(expected),
      // toEqual: (expected) => base.not.toEqual(expected),
      // toStrictEqual: (expected) => base.not.toStrictEqual(expected),
      // toContain: (expected) => base.not.toContain(expected),
      toBeDefined: () => base.not.toBeDefined(),
      // toBeUndefined: () => base.not.toBeUndefined(),
      // toHaveLength: (expected) => base.not.toHaveLength(expected),
      // toBeGreaterThan: (expected) => base.not.toBeGreaterThan(expected),
      // toBeGreaterThanOrEqual: (expected) => base.not.toBeGreaterThanOrEqual(expected),
      // toBeLessThan: (expected) => base.not.toBeLessThan(expected),
      // toBeLessThanOrEqual: (expected) => base.not.toBeLessThanOrEqual(expected),
      // toHaveProperty: (keyPath, value?) =>
      //   value !== undefined
      //     ? base.not.toHaveProperty(keyPath, value)
      //     : base.not.toHaveProperty(keyPath),
    },
  };
}
