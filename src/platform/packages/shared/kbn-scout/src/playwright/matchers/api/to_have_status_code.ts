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
export function toHaveStatusCode(
  obj: unknown,
  expected: number | ToHaveStatusCodeOptions,
  isNegated = false,
  message?: string
): void {
  if (typeof obj !== 'object' || obj === null || (!('status' in obj) && !('statusCode' in obj))) {
    const expectedValue = typeof expected === 'number' ? expected : expected.oneOf;
    throw createMatcherError({
      expected: `${JSON.stringify({ status: expectedValue })} or ${JSON.stringify({
        statusCode: expectedValue,
      })}`,
      matcherName: 'toHaveStatusCode',
      received: obj,
      isNegated,
      message,
    });
  }

  const actual = 'status' in obj ? obj.status : obj.statusCode;
  const codes = typeof expected === 'number' ? [expected] : expected.oneOf;

  try {
    if (isNegated) {
      baseExpect(codes).not.toContain(actual);
    } else {
      baseExpect(codes).toContain(actual);
    }
  } catch {
    throw createMatcherError({
      expected,
      matcherName: 'toHaveStatusCode',
      received: actual,
      isNegated,
      message,
    });
  }
}
