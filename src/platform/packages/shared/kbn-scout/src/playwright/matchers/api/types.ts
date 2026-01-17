/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Matchers for asserting on API Response (AxiosResponse) properties (status, headers, etc.)
 */
export interface ResponseMatchers {
  toHaveStatusCode(code: number): void;
  toHaveStatusText(text: string): void;
  toHaveHeaders(headers: Record<string, string>): void;

  not: Omit<ResponseMatchers, 'not'>;
}

/**
 * Subset of Playwright's GenericAssertions matchers for API tests.
 */
export interface ValueMatchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toContain(expected: unknown): void;
  toBeDefined(): void;
  toBeUndefined(): void;
  toHaveLength(expected: number): void;
  toBeGreaterThan(expected: number | bigint): void;
  toBeGreaterThanOrEqual(expected: number | bigint): void;
  toBeLessThan(expected: number | bigint): void;
  toBeLessThanOrEqual(expected: number | bigint): void;
  toMatchObject(expected: Record<string, unknown> | Array<unknown>): void;
  toHaveProperty(keyPath: string | Array<string>, value?: unknown): void;

  not: Omit<ValueMatchers, 'not'>;
}

/**
 * Full API matchers (response + value) with `not` support.
 */
export interface ApiMatchers extends ResponseMatchers, ValueMatchers {
  not: Omit<ResponseMatchers, 'not'> & Omit<ValueMatchers, 'not'>;
}
