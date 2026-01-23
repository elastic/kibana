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
 * Extracts user filters from a parsed query AST.
 *
 * Parses `createdBy:username` clauses and sanitizes the values.
 *
 * @param query - The parsed EUI Query object.
 * @returns Array of sanitized user identifiers, or `undefined` if none found.
 *
 * @example
 * ```ts
 * const query = Query.parse('createdBy:alice dashboard', { schema });
 * const users = extractUsers(query);
 * // ['alice']
 * ```
 */
export const extractUsers = (query: Query): string[] | undefined => {
  const createdByClauses = query.ast.getFieldClauses('createdBy');
  if (!createdByClauses || createdByClauses.length === 0) {
    return undefined;
  }

  const rawValues: unknown[] = [];
  createdByClauses.forEach((clause) => {
    if (clause.match === 'must') {
      // Include clauses only (exclude clauses would have `match === 'must_not'`).
      const values = Array.isArray(clause.value) ? clause.value : [clause.value];
      rawValues.push(...values);
    }
  });

  const sanitized = sanitizeFilterValues(rawValues);
  return sanitized.length > 0 ? sanitized : undefined;
};
