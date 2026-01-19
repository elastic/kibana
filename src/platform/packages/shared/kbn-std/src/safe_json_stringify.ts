/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const noop = (): string | undefined => {
  return undefined;
};

/**
 * Safely stringifies a value to JSON. If the value cannot be stringified,
 * for instance if it contains circular references, it will return `undefined`.
 * If `handleError` is defined, it will be called with the error, and the
 * response will be returned. This allows consumers to wrap the JSON.stringify
 * error.
 *
 * @param value         The value to stringify.
 * @param handleError   Optional callback that is called when an error occurs during
 *                      stringifying.
 * @returns             The JSON string representation of the value, or `undefined`
 *                      if an error occurs.
 */
export function safeJsonStringify(
  value: unknown,
  handleError: (error: Error) => string | undefined = noop
): string | undefined {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return handleError(error);
  }
}
