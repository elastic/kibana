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
 * Asserts that the response has the expected HTTP status code.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).not.toHaveStatusCode(404);
 */
export function toHaveStatusCode<T extends { status: unknown }>(
  obj: T,
  expected: number,
  isNegated = false
): void {
  const actual = obj.status;
  try {
    if (isNegated) {
      baseExpect(actual).not.toBe(expected);
    } else {
      baseExpect(actual).toBe(expected);
    }
  } catch {
    throw createMatcherError(expected, 'toHaveStatusCode', actual, isNegated);
  }
}
