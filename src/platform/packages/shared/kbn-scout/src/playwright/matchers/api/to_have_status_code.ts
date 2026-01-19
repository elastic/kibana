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

export interface ToHaveStatusCodeOptions {
  /** Match if the status code is one of these values */
  oneOf: number[];
  // Future: range?: [number, number];
}

/**
 * Asserts that the response has the expected HTTP status code.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).toHaveStatusCode({ oneOf: [200, 201] });
 * expect(response).not.toHaveStatusCode(404);
 */
export function toHaveStatusCode<T extends { status: unknown }>(
  obj: T,
  expected: number | ToHaveStatusCodeOptions,
  isNegated = false
): void {
  const actual = obj.status;
  const codes = typeof expected === 'number' ? [expected] : expected.oneOf;

  try {
    if (isNegated) {
      baseExpect(codes).not.toContain(actual);
    } else {
      baseExpect(codes).toContain(actual);
    }
  } catch {
    throw createMatcherError(expected, 'toHaveStatusCode', actual, isNegated);
  }
}
