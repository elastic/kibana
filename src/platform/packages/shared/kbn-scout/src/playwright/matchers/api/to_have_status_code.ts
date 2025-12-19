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
 * Asserts that the response has the expected HTTP status code.
 *
 * @example
 * expectApi(response).toHaveStatusCode(200);
 * expectApi(response).not.toHaveStatusCode(404);
 */
export function toHaveStatusCode(response: ApiClientResponse, expectedStatusCode: number) {
  const assertionName = 'toHaveStatusCode';
  const pass = response.statusCode === expectedStatusCode;

  return {
    pass,
    name: assertionName,
    expected: expectedStatusCode,
    actual: response.statusCode,
    message: () =>
      pass
        ? `Expected response not to have status code ${expectedStatusCode}, but it did`
        : `Expected response to have status code ${expectedStatusCode}, but received ${response.statusCode}`,
  };
}
