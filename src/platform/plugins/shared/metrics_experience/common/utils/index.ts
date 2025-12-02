/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker, Parser, BasicPrettyPrinter } from '@kbn/esql-ast';
import type { ESQLCommand, ComposerQuery } from '@kbn/esql-ast';

/**
 * Extracts the WHERE command string from an ES|QL query.
 * Useful for preserving user-applied filters from Discover queries.
 *
 * @param esqlQuery - The ES|QL query string to parse
 * @returns The printed WHERE command string if found, undefined otherwise
 */
export function extractWhereCommand(esqlQuery: string | undefined): string | undefined {
  if (!esqlQuery || esqlQuery.trim().length === 0) {
    return undefined;
  }

  try {
    const ast = Parser.parse(esqlQuery);
    const whereNode = Walker.find(
      ast.root,
      (node): node is ESQLCommand => node.type === 'command' && node.name === 'where'
    );
    return whereNode ? BasicPrettyPrinter.print(whereNode) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Applies dimension filters and optional user WHERE clause to a ComposerQuery.
 * Uses an accumulator pattern to track param indices across multiple filter entries.
 *
 * @param baseQuery - The base ComposerQuery to apply filters to
 * @param dimensionFilters - A map of field names to arrays of values to filter by
 * @param userQuery - Optional ES|QL query string to extract WHERE clause from
 * @returns The query with all filter WHERE clauses applied
 */
export function applyDimensionFilters(
  baseQuery: ComposerQuery,
  dimensionFilters: Record<string, string[]>,
  userQuery?: string
): ComposerQuery {
  // Use accumulator to carry both query and param index (avoids mutable let)
  const { query: queryWithFilters } = Object.entries(dimensionFilters).reduce(
    (acc, [dimensionName, values]) => {
      if (values.length === 0) {
        return acc;
      }

      const paramNames = values.map((_, i) => `?value${acc.paramIdx + i}`).join(', ');
      const whereClause = `WHERE \`${dimensionName}\`::STRING IN (${paramNames})`;

      const newQuery = values.reduce(
        (q, value, i) => q.setParam(`value${acc.paramIdx + i}`, value),
        acc.query.pipe(whereClause)
      );

      return { query: newQuery, paramIdx: acc.paramIdx + values.length };
    },
    { query: baseQuery, paramIdx: 0 }
  );

  const whereCommand = userQuery ? extractWhereCommand(userQuery) : undefined;
  return whereCommand ? queryWithFilters.pipe(whereCommand) : queryWithFilters;
}
