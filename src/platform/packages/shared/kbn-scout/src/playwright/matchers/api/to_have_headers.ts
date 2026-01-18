/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';
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
export function toHaveHeaders(
  response: AxiosResponse,
  expectedHeaders: Record<string, string>,
  isNegated: boolean = false
): void {
  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(response.headers)) {
    responseHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value!;
  }

  const normalizedExpectedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(expectedHeaders)) {
    normalizedExpectedHeaders[key.toLowerCase()] = value;
  }

  try {
    if (isNegated) {
      baseExpect(responseHeaders).not.toMatchObject(normalizedExpectedHeaders);
    } else {
      baseExpect(responseHeaders).toMatchObject(normalizedExpectedHeaders);
    }
  } catch {
    const expectedDisplay = JSON.stringify(expectedHeaders);
    const actualDisplay = JSON.stringify(responseHeaders);
    throw createMatcherError(expectedDisplay, 'toHaveHeaders', actualDisplay, isNegated);
  }
}
