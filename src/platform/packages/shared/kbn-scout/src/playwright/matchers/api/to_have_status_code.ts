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
 * Asserts that the response has the expected HTTP status code.
 *
 * @example
 * expect(response).toHaveStatusCode(200);
 * expect(response).not.toHaveStatusCode(404);
 */
export function toHaveStatusCode(
  response: AxiosResponse,
  expectedStatusCode: number,
  isNegated = false
): void {
  try {
    if (isNegated) {
      baseExpect(response.status).not.toBe(expectedStatusCode);
    } else {
      baseExpect(response.status).toBe(expectedStatusCode);
    }
  } catch {
    throw createMatcherError(expectedStatusCode, 'toHaveStatusCode', response.status, isNegated);
  }
}
