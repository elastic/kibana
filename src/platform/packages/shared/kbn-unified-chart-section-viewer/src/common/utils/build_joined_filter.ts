/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps each field to a clause and joins them with the given separator.
 * Returns '' when there are no fields so callers can guard with a simple truthy check.
 */
export function buildJoinedFilter(
  fields: string[] | undefined,
  buildClause: (field: string) => string,
  separator: 'AND' | 'OR' = 'AND'
): string {
  return fields?.map(buildClause).join(` ${separator} `) ?? '';
}
