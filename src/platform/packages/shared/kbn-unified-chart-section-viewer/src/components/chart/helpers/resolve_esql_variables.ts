/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';

export function resolveEsqlVariables(
  query: Query | AggregateQuery,
  variables: ESQLControlVariable[] | undefined
): Query | AggregateQuery {
  if (!variables?.length || !('esql' in query)) {
    return query;
  }

  let resolved = query.esql;
  // Sort by descending key length so that longer variable names are replaced first.
  // This prevents a shorter variable (e.g. ?ban) from matching inside a longer one
  // (e.g. ?banana), which would leave the query in an invalid state (e.g. "someValueana").
  const sortedVariables = [...variables].sort((a, b) => b.key.length - a.key.length);
  for (const { key, value } of sortedVariables) {
    const literal = typeof value === 'string' ? `"${value.replaceAll('"', '""')}"` : String(value);
    resolved = resolved.replaceAll(`?${key}`, literal);
  }

  return { esql: resolved };
}
