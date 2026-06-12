/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const noop = <T = unknown>(): T => {
  return undefined as T;
};

/**
 * Safely parses a JSON string. If the string cannot be parsed, for instance
 * if it is not valid JSON, it will return `undefined`. If `handleError` is
 * defined, it will be called with the error, and the response from the callback
 * will be returned. This allows consumers to wrap the JSON.parse error.
 *
 * @param value         The JSON string to parse.
 * @param handleError   Optional callback that is called when an error
 *                      during parsing. Its return value is returned from the
 *                      function.
 * @returns             The parsed object, or `undefined` if an error occurs.
 */
export function safeJsonParse<T = unknown>(
  value: string,
  handleError: (error: Error) => T = noop
): T {
  try {
    return JSON.parse(value);
  } catch (error) {
    return handleError(error);
  }
}
