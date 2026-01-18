/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToHaveDataOptions } from './to_have_data';

export interface StatusMatchers {
  toHaveStatusCode(code: number): void;
}

export interface StatusTextMatchers {
  toHaveStatusText(text: string): void;
}

export interface HeadersMatchers {
  toHaveHeaders(headers: Record<string, string>): void;
}

export interface DataMatchers {
  toHaveData(expected?: unknown, options?: ToHaveDataOptions): void;
}

type IsAny<T> = 0 extends 1 & T ? true : false;

/** Builds conditional response matchers based on properties in T */
type ResponseMatchersFor<T> = (T extends { status: number } ? StatusMatchers : {}) &
  (T extends { statusText: string } ? StatusTextMatchers : {}) &
  (T extends { headers: object } ? HeadersMatchers : {}) &
  (T extends { data: unknown } ? DataMatchers : {});

/**
 * Returns matchers based on the input type T.
 * - When T is `any`: only ValueMatchers (enforces explicit typing)
 * - Otherwise: ValueMatchers + response matchers for properties present in T
 */
export type MatchersFor<T> = IsAny<T> extends true
  ? ValueMatchers
  : ValueMatchers &
      ResponseMatchersFor<T> & {
        not: Omit<ValueMatchers, 'not'> & ResponseMatchersFor<T>;
      };

export interface ValueMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number | bigint): void;
  toBeGreaterThanOrEqual(expected: number | bigint): void;
  toBeLessThan(expected: number | bigint): void;
  toBeLessThanOrEqual(expected: number | bigint): void;
  toHaveProperty(keyPath: string | string[], value?: unknown): void;

  not: Omit<ValueMatchers, 'not'>;
}
