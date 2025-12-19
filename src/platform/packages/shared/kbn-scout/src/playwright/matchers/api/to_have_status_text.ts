/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientResponse } from '../../fixtures/scope/worker/api_client';

/**
 * Asserts that the response has the expected status text (body text for non-JSON responses).
 *
 * @example
 * expectApi(response).not.toHaveStatusText('OK');
 * expectApi(response).toHaveStatusText('Not Found');
 */
export function toHaveStatusText(response: ApiClientResponse, expectedStatusText: string) {
  const assertionName = 'toHaveStatusText';
  const pass = response.statusMessage === expectedStatusText;

  return {
    pass,
    name: assertionName,
    expected: expectedStatusText,
    actual: response.statusMessage,
    message: () =>
      pass
        ? `Expected response not to have status text "${expectedStatusText}", but it did`
        : `Expected response to have status text "${expectedStatusText}", but received "${response.statusMessage}"`,
  };
}
