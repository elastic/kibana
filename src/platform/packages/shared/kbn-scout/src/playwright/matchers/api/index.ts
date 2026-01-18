/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import type { AxiosResponse } from 'axios';
import { toHaveStatusCode } from './to_have_status_code';
import { toHaveStatusText } from './to_have_status_text';
import { toHaveHeaders } from './to_have_headers';
import { toHaveData } from './to_have_data';
import type { ApiMatchers, ResponseMatchers, ToHaveDataOptions, ValueMatchers } from './types';

/**
 * Type guard to check if a value is an AxiosResponse.
 */
function isAxiosResponse(value: any): value is AxiosResponse {
  if (!value || typeof value !== 'object') return false;

  const keys = Object.keys(value);
  const validKeys5 = ['data', 'status', 'statusText', 'headers', 'config'];

  if (keys.length === 5) {
    return validKeys5.every((k) => k in value);
  }

  if (keys.length === 6) {
    return validKeys5.every((k) => k in value) && 'request' in value;
  }

  return false;
}

/**
 * Creates value matchers (delegating to Playwright's expect).
 */
function createValueMatchers(base: ReturnType<typeof baseExpect>): ValueMatchers {
  return {
    toBe: (...args: Parameters<typeof base.toBe>) => base.toBe(...args),
    toEqual: (...args: Parameters<typeof base.toEqual>) => base.toEqual(...args),
    toContain: (...args: Parameters<typeof base.toContain>) => base.toContain(...args),
    toBeDefined: (...args: Parameters<typeof base.toBeDefined>) => base.toBeDefined(...args),
    toBeUndefined: (...args: Parameters<typeof base.toBeUndefined>) => base.toBeUndefined(...args),
    toHaveLength: (...args: Parameters<typeof base.toHaveLength>) => base.toHaveLength(...args),
    toBeGreaterThan: (...args: Parameters<typeof base.toBeGreaterThan>) =>
      base.toBeGreaterThan(...args),
    toBeGreaterThanOrEqual: (...args: Parameters<typeof base.toBeGreaterThanOrEqual>) =>
      base.toBeGreaterThanOrEqual(...args),
    toBeLessThan: (...args: Parameters<typeof base.toBeLessThan>) => base.toBeLessThan(...args),
    toBeLessThanOrEqual: (...args: Parameters<typeof base.toBeLessThanOrEqual>) =>
      base.toBeLessThanOrEqual(...args),
    toMatchObject: (...args: Parameters<typeof base.toMatchObject>) => base.toMatchObject(...args),
    toHaveProperty: (...args: Parameters<typeof base.toHaveProperty>) =>
      base.toHaveProperty(...args),

    not: {
      toBe: (...args: Parameters<typeof base.not.toBe>) => base.not.toBe(...args),
      toEqual: (...args: Parameters<typeof base.not.toEqual>) => base.not.toEqual(...args),
      toContain: (...args: Parameters<typeof base.not.toContain>) => base.not.toContain(...args),
      toBeDefined: (...args: Parameters<typeof base.not.toBeDefined>) =>
        base.not.toBeDefined(...args),
      toBeUndefined: (...args: Parameters<typeof base.not.toBeUndefined>) =>
        base.not.toBeUndefined(...args),
      toHaveLength: (...args: Parameters<typeof base.not.toHaveLength>) =>
        base.not.toHaveLength(...args),
      toBeGreaterThan: (...args: Parameters<typeof base.not.toBeGreaterThan>) =>
        base.not.toBeGreaterThan(...args),
      toBeGreaterThanOrEqual: (...args: Parameters<typeof base.not.toBeGreaterThanOrEqual>) =>
        base.not.toBeGreaterThanOrEqual(...args),
      toBeLessThan: (...args: Parameters<typeof base.not.toBeLessThan>) =>
        base.not.toBeLessThan(...args),
      toBeLessThanOrEqual: (...args: Parameters<typeof base.not.toBeLessThanOrEqual>) =>
        base.not.toBeLessThanOrEqual(...args),
      toMatchObject: (...args: Parameters<typeof base.not.toMatchObject>) =>
        base.not.toMatchObject(...args),
      toHaveProperty: (...args: Parameters<typeof base.not.toHaveProperty>) =>
        base.not.toHaveProperty(...args),
    },
  };
}

/**
 * Creates Response matchers for AxiosResponse objects.
 */
function createResponseMatchers(response: AxiosResponse): ResponseMatchers {
  return {
    toHaveStatusCode: (code: number) => toHaveStatusCode(response, code),
    toHaveStatusText: (text: string) => toHaveStatusText(response, text),
    toHaveHeaders: (headers: Record<string, string>) => toHaveHeaders(response, headers),
    toHaveData: (expected?: unknown, options?: ToHaveDataOptions) =>
      toHaveData(response, expected, options),

    not: {
      toHaveStatusCode: (code: number) => toHaveStatusCode(response, code, true),
      toHaveStatusText: (text: string) => toHaveStatusText(response, text, true),
      toHaveHeaders: (headers: Record<string, string>) => toHaveHeaders(response, headers, true),
      toHaveData: (expected?: unknown, options?: ToHaveDataOptions) =>
        toHaveData(response, expected, options, true),
    },
  };
}

/**
 * Custom expect wrapper for API responses.
 *
 * Provides a constrained interface with:
 * - API Response matchers (e.g. toHaveStatusCode)
 * - Essential value matchers (e.g. toBe, toEqual, toContain, etc.)
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 *
 * expect(response.data.name).toBe('test');
 * expect(response.data.items).toHaveLength(3);
 */
export function expect(actual: AxiosResponse): ResponseMatchers;
export function expect(actual: any): ApiMatchers;
export function expect<T>(actual: T): ValueMatchers;
export function expect(actual: unknown): ResponseMatchers | ApiMatchers | ValueMatchers {
  // eslint-disable-next-line playwright/valid-expect
  const base = baseExpect(actual);

  if (isAxiosResponse(actual)) {
    return createResponseMatchers(actual);
  }

  return createValueMatchers(base);
}

// Re-export types
export type { ApiMatchers } from './types';
