/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import { sanitazeESQLInput } from './sanitaze_input';
import { appendToESQLQuery } from './append_to_query';

/**
 * Appends a set of conditions to an ES|QL query's WHERE clause.
 * This function is designed to handle multi-term filters, treating a combination of fields and values as a single atomic unit.
 * It can add new filter sets, negate existing sets, or toggle them from positive to negative and vice-versa.
 *
 * @param baseESQLQuery The base ES|QL query string.
 * @param fields An array of field names to be included in the filter set.
 * @param values An array of corresponding values for the fields.
 * @param operation The operation to perform: '+' for a positive filter (AND), '-' for a negative filter (AND NOT).
 * @param fieldTypes An optional array of field types, used to determine if casting is needed.
 * @returns The updated ES|QL query string.
 */
export function appendSetWhereClauseToESQLQuery(
  baseESQLQuery: string,
  fields: string[],
  values: unknown[],
  operation: '+' | '-',
  fieldTypes: (string | undefined)[] = []
): string {
  // Build the individual conditions for the set (e.g., `\`host.name\`=="host-a"`, `\`region\`=="us-east-1"`)
  const conditions = fields
    .map((f, i) => {
      const currentVal = values[i];
      const currentType = fieldTypes[i];
      const fieldName = sanitazeESQLInput(f);

      if (currentVal === null || currentVal === undefined) {
        return `${fieldName} is null`;
      }

      let castFieldName = fieldName;
      if (currentType !== 'string' && currentType !== 'number' && currentType !== 'boolean') {
        castFieldName = `${fieldName}::string`;
      }

      const filterValue =
        typeof currentVal === 'string'
          ? `"${currentVal.replace(/\\/g, '\\\\').replace(/"/g, '"')}"`
          : currentVal;

      return `${castFieldName}==${filterValue}`;
    })
    .filter(Boolean);

  // Create all possible string variations of the filter set
  const setClause = `(${conditions.join(' AND ')})`;
  const positiveClause = `AND ${setClause}`;
  const negativeClause = `AND NOT ${setClause}`;
  const wherePositiveClause = `| WHERE ${setClause}`;
  const whereNegativeClause = `| WHERE NOT ${setClause}`;

  // --- Toggle Logic ---
  // Check if the opposite of the intended operation already exists. If so, toggle it.

  // Handles toggling from positive (AND ...) to negative (AND NOT ...)
  if (baseESQLQuery.includes(positiveClause)) {
    if (operation === '-') {
      return baseESQLQuery.replace(positiveClause, negativeClause);
    }
    return baseESQLQuery; // Idempotent: Do nothing if the filter already exists
  }

  // Handles toggling from negative (AND NOT ...) to positive (AND ...)
  if (baseESQLQuery.includes(negativeClause)) {
    if (operation === '+') {
      return baseESQLQuery.replace(negativeClause, positiveClause);
    }
    return baseESQLQuery; // Idempotent: Do nothing if the filter already exists
  }

  // Handles toggling when the set is the only condition in the WHERE clause
  if (baseESQLQuery.includes(wherePositiveClause)) {
    if (operation === '-') {
      return baseESQLQuery.replace(wherePositiveClause, whereNegativeClause);
    }
    return baseESQLQuery;
  }

  if (baseESQLQuery.includes(whereNegativeClause)) {
    if (operation === '+') {
      return baseESQLQuery.replace(whereNegativeClause, wherePositiveClause);
    }
    return baseESQLQuery;
  }

  // --- Append Logic ---
  // If no existing filter was found to toggle, append the new filter set.

  const { ast } = parse(baseESQLQuery);
  const lastCommandIsWhere = ast.length > 0 && ast[ast.length - 1].name === 'where';

  if (lastCommandIsWhere) {
    // If a WHERE clause already exists, append with AND
    return appendToESQLQuery(baseESQLQuery, operation === '+' ? positiveClause : negativeClause);
  } else {
    // Otherwise, create a new WHERE clause
    return appendToESQLQuery(
      baseESQLQuery,
      operation === '+' ? wherePositiveClause : whereNegativeClause
    );
  }
}
