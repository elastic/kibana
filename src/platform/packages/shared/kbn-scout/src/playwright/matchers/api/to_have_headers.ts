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
 * Asserts that the response contains the expected headers.
 * This is a partial match - the response can contain additional headers.
 *
 * @example
 * expectApi(response).toHaveHeaders({ 'content-type': 'application/json', 'x-custom': 'value' });
 * expectApi(response).not.toHaveHeaders({ 'x-forbidden': 'value' });
 */
export function toHaveHeaders(
  response: ApiClientResponse,
  expectedHeaders: Record<string, string>
) {
  const assertionName = 'toHaveHeaders';
  const normalizeHeaderKey = (key: string) => key.toLowerCase();

  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(response.headers)) {
    responseHeaders[normalizeHeaderKey(key)] = Array.isArray(value) ? value.join(', ') : value!;
  }

  const missingHeaders: string[] = [];
  const mismatchedHeaders: Array<{ key: string; expected: string; actual: string | undefined }> =
    [];

  for (const [headerKey, expectedValue] of Object.entries(expectedHeaders)) {
    const normalizedKey = normalizeHeaderKey(headerKey);
    const actualValue = responseHeaders[normalizedKey];

    if (actualValue === undefined) {
      missingHeaders.push(headerKey);
    } else if (actualValue !== expectedValue) {
      mismatchedHeaders.push({ key: headerKey, expected: expectedValue, actual: actualValue });
    }
  }

  const pass = missingHeaders.length === 0 && mismatchedHeaders.length === 0;

  return {
    pass,
    name: assertionName,
    expected: expectedHeaders,
    actual: responseHeaders,
    message: () => {
      if (pass) {
        return 'Expected response not to have the specified headers, but it did';
      }

      const messages: string[] = [];
      if (missingHeaders.length > 0) {
        messages.push(`Missing headers: ${missingHeaders.join(', ')}`);
      }
      if (mismatchedHeaders.length > 0) {
        const mismatchDetails = mismatchedHeaders
          .map((h) => `${h.key} (expected "${h.expected}", got "${h.actual}")`)
          .join(', ');
        messages.push(`Mismatched headers: ${mismatchDetails}`);
      }
      return `Expected response to have headers:\n${messages.join('\n')}`;
    },
  };
}
