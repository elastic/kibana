/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosResponse } from 'axios';

/**
 * Asserts that the response has the expected status text.
 *
 * @example
 * expect(response).toHaveStatusText('OK');
 * expect(response).not.toHaveStatusText('Not Found');
 */
export function toHaveStatusText(
  response: AxiosResponse,
  expectedStatusText: string,
  isNegated: boolean = false
): void {
  const pass = response.statusText === expectedStatusText;

  if (isNegated) {
    if (pass) {
      throw new Error(
        `Expected response not to have status text "${expectedStatusText}", but it did`
      );
    }
  } else {
    if (!pass) {
      throw new Error(
        `Expected response to have status text "${expectedStatusText}", but received "${response.statusText}"`
      );
    }
  }
}
