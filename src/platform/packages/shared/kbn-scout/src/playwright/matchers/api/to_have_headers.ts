/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as baseExpect } from '@playwright/test';
import { createMatcherError } from './utils';

/**
 * Asserts that the response contains the expected headers.
 * This is a partial match - the response can contain additional headers.
 * Header keys are case-insensitive.
 *
 * @example
 * expect(response).toHaveHeaders({ 'content-type': 'application/json' });
 * expect(response).not.toHaveHeaders({ 'x-forbidden': 'value' });
 */
export function toHaveHeaders<T extends { headers?: Record<string, string> }>(
  obj: T,
  expectedHeaders: Record<string, string>,
  isNegated = false
): void {
  const actualHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj.headers ?? {})) {
    actualHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value!;
  }

  const normalizedExpected: Record<string, string> = {};
  for (const [key, value] of Object.entries(expectedHeaders)) {
    normalizedExpected[key.toLowerCase()] = value;
  }

  try {
    if (isNegated) {
      baseExpect(actualHeaders).not.toMatchObject(normalizedExpected);
    } else {
      baseExpect(actualHeaders).toMatchObject(normalizedExpected);
    }
  } catch {
    throw createMatcherError(
      JSON.stringify(normalizedExpected),
      'toHaveHeaders',
      JSON.stringify(actualHeaders),
      isNegated
    );
  }
}
