/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { GenericMatchers } from './types';

/**
 * Create generic matchers delegating to Playwright/Jest expect
 */
export function createGenericMatchers(actual: unknown): GenericMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const base = baseExpect(actual);
  return {
    toBe: (expected: unknown) => base.toBe(expected),
    toBeDefined: () => base.toBeDefined(),
    toBeUndefined: () => base.toBeUndefined(),
    toContain: (expected: unknown) => base.toContain(expected),
    toHaveLength: (expected: number) => base.toHaveLength(expected),
    toStrictEqual: (expected: unknown) => base.toStrictEqual(expected),
    toBeGreaterThan: (expected: number) => base.toBeGreaterThan(expected),
    toBeLessThan: (expected: number) => base.toBeLessThan(expected),
    toMatchObject: (expected: Record<string, unknown> | unknown[]) => base.toMatchObject(expected),
    not: {
      toBe: (expected: unknown) => base.not.toBe(expected),
      toBeUndefined: () => base.not.toBeUndefined(),
      toContain: (expected: unknown) => base.not.toContain(expected),
      toHaveLength: (expected: number) => base.not.toHaveLength(expected),
      toStrictEqual: (expected: unknown) => base.not.toStrictEqual(expected),
      toBeGreaterThan: (expected: number) => base.not.toBeGreaterThan(expected),
      toBeLessThan: (expected: number) => base.not.toBeLessThan(expected),
      toMatchObject: (expected: Record<string, unknown> | unknown[]) =>
        base.not.toMatchObject(expected),
    },
  };
}
