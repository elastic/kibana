/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToHavePayloadOptions } from './to_have_payload';

import type { ToHaveStatusCodeOptions } from './to_have_status_code';

export interface StatusMatchers {
  toHaveStatusCode(code: number | ToHaveStatusCodeOptions): void;
}

export interface StatusTextMatchers {
  toHaveStatusText(text: string): void;
}

export interface HeadersMatchers {
  toHaveHeaders(headers: Record<string, string>): void;
}

export interface PayloadMatchers {
  toHavePayload(expected?: unknown, options?: ToHavePayloadOptions): void;
}

type IsAny<T> = 0 extends 1 & T ? true : false;

/** Builds conditional response matchers based on properties in T */
type ResponseMatchersFor<T> = (T extends { status: number } | { statusCode: number }
  ? StatusMatchers
  : {}) &
  (T extends { statusText: string } | { statusMessage: string } ? StatusTextMatchers : {}) &
  (T extends { headers: object } ? HeadersMatchers : {}) &
  (T extends { data: unknown } | { body: unknown } ? PayloadMatchers : {});

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
  toBeDefined(): void;

  not: Omit<ValueMatchers, 'not'>;
}

/**
 * Represents an asymmetric matcher that can be used inside toHavePayload().
 * These matchers are identified by Jest/Playwright via the $$typeof symbol.
 */
export interface AsymmetricMatcher {
  $$typeof: symbol;
  asymmetricMatch(other: unknown): boolean;
  toString(): string;
  toAsymmetricMatcher?(): string;
}

/**
 * Custom asymmetric matchers available on the expect object.
 * These can be used inside toHavePayload() for flexible value matching.
 */
export interface AsymmetricMatchers {
  /** Matches any value that is not null or undefined */
  toBeDefined(): AsymmetricMatcher;
  /** Matches any number greater than the specified value */
  toBeGreaterThan(min: number): AsymmetricMatcher;
  /** Matches any array or string with the specified length, or any length > 0 if not specified */
  toHaveLength(length?: number): AsymmetricMatcher;
}
