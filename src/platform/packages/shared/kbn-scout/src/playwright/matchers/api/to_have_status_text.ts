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
 * Asserts that the response has the expected status text.
 *
 * @example
 * expect(response).toHaveStatusText('OK');
 * expect(response).not.toHaveStatusText('Not Found');
 */
export function toHaveStatusText(
  obj: unknown,
  expected: string,
  isNegated = false,
  message?: string
): void {
  if (
    typeof obj !== 'object' ||
    obj === null ||
    (!('statusText' in obj) && !('statusMessage' in obj))
  ) {
    throw createMatcherError({
      expected: `${JSON.stringify({ statusText: expected })} or ${JSON.stringify({
        statusMessage: expected,
      })}`,
      matcherName: 'toHaveStatusText',
      received: obj,
      isNegated,
      message,
    });
  }

  const actual = 'statusText' in obj ? obj.statusText : obj.statusMessage;
  try {
    if (isNegated) {
      baseExpect(actual).not.toBe(expected);
    } else {
      baseExpect(actual).toBe(expected);
    }
  } catch {
    throw createMatcherError({
      expected,
      matcherName: 'toHaveStatusText',
      received: actual,
      isNegated,
      message,
    });
  }
}
