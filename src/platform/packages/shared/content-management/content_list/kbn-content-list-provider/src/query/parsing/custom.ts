/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@elastic/eui';
import { sanitizeFilterValues } from './sanitize';

/**
 * Extracts custom filter values from a parsed query AST.
 *
 * Parses custom field clauses (e.g., `status:active`) and sanitizes the values.
 *
 * @param query - The parsed EUI Query object.
 * @param customFilterKeys - Array of custom filter field names to extract.
 * @returns Record mapping field names to arrays of sanitized values.
 *
 * @example
 * ```ts
 * const query = Query.parse('status:active priority:high', { schema });
 * const custom = extractCustomFilters(query, ['status', 'priority']);
 * // { status: ['active'], priority: ['high'] }
 * ```
 */
export const extractCustomFilters = (
  query: Query,
  customFilterKeys: string[]
): Record<string, string[]> => {
  const parsedCustomFilters: Record<string, string[]> = {};

  customFilterKeys.forEach((key) => {
    const clauses = query.ast.getFieldClauses(key);
    if (clauses && clauses.length > 0) {
      const rawValues: unknown[] = [];
      clauses.forEach((clause) => {
        if (clause.match === 'must') {
          // Include clauses only.
          const values = Array.isArray(clause.value) ? clause.value : [clause.value];
          rawValues.push(...values);
        }
      });
      const sanitized = sanitizeFilterValues(rawValues);
      if (sanitized.length > 0) {
        parsedCustomFilters[key] = sanitized;
      }
    }
  });

  return parsedCustomFilters;
};
