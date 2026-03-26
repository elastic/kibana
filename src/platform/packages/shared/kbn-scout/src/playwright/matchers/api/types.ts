/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { expect as baseExpect } from '@playwright/test';
import type { ToHaveStatusCodeOptions } from './to_have_status_code';

/**
 * Options for the expect function.
 */
export interface ExpectOptions {
  /** Custom message to display on assertion failure */
  message?: string;
}

/**
 * Second parameter for expect() - can be a string (shorthand for message) or options object.
 */
export type ExpectOptionsOrMessage = string | ExpectOptions;

/**
 * Generic matchers that delegate to Playwright/Jest expect.
 * These work on any value type.
 */
export interface GenericMatchers {
  /** Compares value with `expected` by calling `Object.is`. Compares objects by reference instead of their contents, similarly to the strict equality operator `===` */
  toBe(expected: unknown): void;
  /** Ensures that value is not `undefined` */
  toBeDefined(): void;
  /** Ensures that value is `undefined` */
  toBeUndefined(): void;
  /** Ensures that string value contains an expected substring. Comparison is case-sensitive. Also ensures that an Array or Set contains an expected item */
  toContain(expected: unknown): void;
  /** Ensures that value has a `.length` property equal to `expected`. Useful for arrays and strings */
  toHaveLength(expected: number): void;
  /** Compares contents of the value with contents of `expected` and their types */
  toStrictEqual(expected: unknown): void;
  /** Ensures that `value > expected` for number or big integer values */
  toBeGreaterThan(expected: number): void;
  /** Ensures that `value < expected` for number or big integer values */
  toBeLessThan(expected: number): void;
  /** Compares contents of the value with contents of `expected`, performing "deep equality" check. Allows extra properties to be present in the value */
  toMatchObject(expected: unknown): void;
  /** Ensures that string value matches a regular expression or string */
  toMatch(expected: string | RegExp): void;
  /** Ensures that value is `null` */
  toBeNull(): void;
  /** Compares floating point numbers for approximate equality. Use this method instead of `toBe` when comparing floating point numbers */
  toBeCloseTo(expected: number, numDigits?: number): void;
  /** Ensures that value is an instance of a class. Uses `instanceof` operator */
  toBeInstanceOf(expected: new (...args: unknown[]) => unknown): void;
  /** Calls the function and ensures it throws an error. Optionally compares the error with `expected` (string, regex, error object, or error class) */
  toThrow(expected?: unknown): void;
  /** An alias for `toThrow` */
  toThrowError(expected?: unknown): void;

  /** Async matchers for promises that are expected to reject */
  rejects: {
    /** Ensures that a rejected promise throws an error that optionally matches `expected` */
    toThrow(expected?: unknown): Promise<void>;
  };

  not: Omit<GenericMatchers, 'not' | 'toBeDefined' | 'toBeNull' | 'rejects'>;
}

/**
 * Response matchers for API response assertions.
 * These validate HTTP response properties.
 */
export interface ResponseMatchers {
  /** Asserts the response has the expected status code */
  toHaveStatusCode(code: number | ToHaveStatusCodeOptions): void;
  /** Asserts the response has the expected status text */
  toHaveStatusText(text: string): void;
  /** Asserts the response has the expected headers */
  toHaveHeaders(headers: Record<string, string>): void;
}

/**
 * Combined matchers returned by expect().
 * Includes both generic matchers and response matchers.
 */
export type Matchers = GenericMatchers &
  ResponseMatchers & {
    not: Omit<GenericMatchers, 'not' | 'toBeDefined' | 'toBeNull' | 'rejects'>;
  };

/**
 * Playwright's AsymmetricMatcher type is not exported, so it's derived from
 * `baseExpect.anything`, but all asymmetric matchers (anything, arrayContaining,
 * objectContaining, etc.) return the same type.
 */
export type AsymmetricMatcher = ReturnType<typeof baseExpect.anything>;

/**
 * Asymmetric matchers available on the expect object.
 * These can be used inside toMatchObject() for flexible value matching.
 */
export interface AsymmetricMatchers {
  /** Ensures that `value > expected` for number values */
  toBeGreaterThan(min: number): AsymmetricMatcher;
  /** Ensures that `value < expected` for number values */
  toBeLessThan(max: number): AsymmetricMatcher;
  /** Matches an array that contains all of the elements in the expected array, in any order */
  arrayContaining<T>(expected: T[]): AsymmetricMatcher;
  /** Matches an object that contains and matches all of the properties in the expected object */
  objectContaining<T extends Record<string, unknown>>(expected: T): AsymmetricMatcher;
}
