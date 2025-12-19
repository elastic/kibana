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
 * Asserts that the response body contains the expected properties (root-level partial match).
 * Nested objects and arrays are compared using deep equality.
 *
 * @example
 * expectApi(response).toMatchJSON({ id: 123 });
 * expectApi(response).not.toMatchJSON({ name: 'test' });
 */
export function toMatchJSON(response: ApiClientResponse, expectedBody: Record<string, unknown>) {
  const assertionName = 'toMatchJSON';
  const body = response.body as Record<string, unknown>;

  const missingKeys: string[] = [];
  const mismatchedKeys: Array<{ key: string; expected: unknown; actual: unknown }> = [];

  for (const [key, expectedValue] of Object.entries(expectedBody)) {
    if (!(key in body)) {
      missingKeys.push(key);
    } else if (JSON.stringify(body[key]) !== JSON.stringify(expectedValue)) {
      mismatchedKeys.push({ key, expected: expectedValue, actual: body[key] });
    }
  }

  const pass = missingKeys.length === 0 && mismatchedKeys.length === 0;

  return {
    pass,
    name: assertionName,
    expected: expectedBody,
    actual: body,
    message: () => {
      if (pass) {
        return 'Expected response body not to match, but it did';
      }

      const messages: string[] = [];
      if (missingKeys.length > 0) {
        messages.push(`Missing properties: ${missingKeys.join(', ')}`);
      }
      if (mismatchedKeys.length > 0) {
        const mismatchDetails = mismatchedKeys
          .map(
            (m) =>
              `${m.key} (expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)})`
          )
          .join(', ');
        messages.push(`Mismatched properties: ${mismatchDetails}`);
      }
      return `Expected response body to match:\n${messages.join('\n')}`;
    },
  };
}
