/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@elastic/eui';

/**
 * Extracts the clean search query from a parsed query AST.
 *
 * Returns only the term clauses (free text), excluding field clauses
 * and `is:` clauses.
 *
 * @param query - The parsed EUI Query object.
 * @returns The clean search text, or `undefined` if no terms found.
 *
 * @example
 * ```ts
 * const query = Query.parse('is:starred createdBy:alice dashboard search', { schema });
 * const searchText = extractCleanSearch(query);
 * // 'dashboard search'
 * ```
 */
export const extractCleanSearch = (query: Query): string | undefined => {
  const termClauses = query.ast.getTermClauses();
  if (termClauses.length === 0) {
    return undefined;
  }

  const cleanSearchQuery = termClauses
    .map((clause) => String(clause.value))
    .join(' ')
    .trim();

  return cleanSearchQuery || undefined;
};
