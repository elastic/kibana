/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Converts a string value to a URL-safe slug identifier.
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters (except underscores) with hyphens
 * - Trims leading and trailing hyphens
 *
 * @param value - The string to convert
 * @returns A slugified identifier
 *
 * @example
 * toSlugIdentifier('My Connector') // 'my-connector'
 * toSlugIdentifier('Test Space ') // 'test-space'
 */
export function toSlugIdentifier(value = ''): string {
  let result = value.toLowerCase().replace(/[^a-z0-9_]/g, '-');

  while (result.startsWith('-')) {
    result = result.slice(1);
  }
  while (result.endsWith('-')) {
    result = result.slice(0, -1);
  }

  return result;
}

/**
 * Validates whether a string is already a valid slug identifier.
 *
 * @param value - The string to validate
 * @returns True if the value is a valid slug identifier
 */
export function isValidSlugIdentifier(value = ''): boolean {
  return value === toSlugIdentifier(value);
}
