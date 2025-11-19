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
 * Extracts the starred filter from a parsed query AST.
 *
 * Checks for `is:starred` clause in the query.
 *
 * @param query - The parsed EUI Query object.
 * @returns `true` if `is:starred` is present, `false` otherwise.
 *
 * @example
 * ```ts
 * const query = Query.parse('is:starred dashboard', { schema });
 * const starredOnly = extractStarred(query);
 * // true
 * ```
 */
export const extractStarred = (query: Query): boolean => {
  return query.hasIsClause('starred');
};
