/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validates and sanitizes a filter value to prevent injection attacks.
 * Only allows alphanumeric characters, hyphens, underscores, dots, and @ signs.
 * Returns `undefined` for invalid values.
 */
export const sanitizeFilterValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  // Allow alphanumeric, hyphens, underscores, dots, @ signs, and spaces.
  // This covers common identifiers, emails, and user-friendly names.
  const sanitized = value.trim();
  if (!/^[\w\-.\s@]+$/u.test(sanitized)) {
    return undefined;
  }
  return sanitized;
};

/**
 * Sanitizes an array of filter values, removing any invalid entries.
 */
export const sanitizeFilterValues = (values: unknown[]): string[] => {
  return values.map(sanitizeFilterValue).filter((v): v is string => v !== undefined);
};
