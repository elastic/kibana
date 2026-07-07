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
 * - Collapses multiple hyphens
 * - Removes non-word chars
 * - Converts spaces and underscores to hyphens
 *
 * @param value - The string to convert
 * @returns A slugified identifier
 *
 * @example
 * toSlugIdentifier('My Connector') // 'my-connector'
 * toSlugIdentifier('Test Space ') // 'test-space'
 */
const MAX_SLUG_INPUT_SIZE = 1000;

export function toSlugIdentifier(value = ''): string {
  if (value === null) return '';
  if (value.length > MAX_SLUG_INPUT_SIZE) {
    throw new Error(`Input too long: must be ${MAX_SLUG_INPUT_SIZE} characters or fewer`);
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF]+/g, '') // strip diacritics
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '-')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
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
