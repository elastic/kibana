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
import { wrapMatcher } from './utils';

/**
 * Create generic matchers delegating to Playwright/Jest expect
 */
export function createGenericMatchers(actual: unknown): GenericMatchers {
  const base = baseExpect(actual);
  return {
    toBe: wrapMatcher((expected: unknown) => base.toBe(expected)),
    toBeDefined: wrapMatcher(() => base.toBeDefined()),
    toBeUndefined: wrapMatcher(() => base.toBeUndefined()),
    toContain: wrapMatcher((expected: unknown) => base.toContain(expected)),
    toHaveLength: wrapMatcher((expected: number) => base.toHaveLength(expected)),
    toStrictEqual: wrapMatcher((expected: unknown) => base.toStrictEqual(expected)),
    toBeGreaterThan: wrapMatcher((expected: number) => base.toBeGreaterThan(expected)),
    toBeLessThan: wrapMatcher((expected: number) => base.toBeLessThan(expected)),
    toMatchObject: wrapMatcher((expected: Record<string, unknown> | unknown[]) =>
      base.toMatchObject(expected)
    ),
    not: {
      toBe: wrapMatcher((expected: unknown) => base.not.toBe(expected)),
      toBeUndefined: wrapMatcher(() => base.not.toBeUndefined()),
      toContain: wrapMatcher((expected: unknown) => base.not.toContain(expected)),
      toHaveLength: wrapMatcher((expected: number) => base.not.toHaveLength(expected)),
      toStrictEqual: wrapMatcher((expected: unknown) => base.not.toStrictEqual(expected)),
      toBeGreaterThan: wrapMatcher((expected: number) => base.not.toBeGreaterThan(expected)),
      toBeLessThan: wrapMatcher((expected: number) => base.not.toBeLessThan(expected)),
      toMatchObject: wrapMatcher((expected: Record<string, unknown> | unknown[]) =>
        base.not.toMatchObject(expected)
      ),
    },
  };
}
