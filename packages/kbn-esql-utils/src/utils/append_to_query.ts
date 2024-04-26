/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

// Append in a new line the appended text to take care of the case where the user adds a comment at the end of the query
// in these cases a base query such as "from index // comment" will result in errors or wrong data if we don't append in a new line
export function appendToESQLQuery(baseESQLQuery: string, appendedText: string): string {
  return `${baseESQLQuery}\n${appendedText}`;
}

export function appendWhereClauseToESQLQuery(
  baseESQLQuery: string,
  field: string,
  value: unknown,
  operation: '+' | '-',
  fieldType?: string
): string {
  let operator = operation === '+' ? '==' : '!=';
  let filterValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
  let fieldName = `\`${field}\``;

  // casting
  if (fieldType !== 'string' && fieldType !== 'number') {
    fieldName = `${fieldName}::string`;
  }

  // checking that the value is not null
  if (field === '_exists_') {
    fieldName = String(value);
    operator = ' is not null';
    filterValue = '';
  }

  const { ast } = getAstAndSyntaxErrors(baseESQLQuery);

  const lastCommandIsWhere = ast[ast.length - 1].name === 'where';
  // if where command already exists in the end of the query
  if (lastCommandIsWhere) {
    const whereCommand = ast[ast.length - 1];
    const whereAstText = whereCommand.text;
    if (whereAstText.includes(fieldName) && whereAstText.includes(String(filterValue))) {
      const pipesArray = baseESQLQuery.split('|');
      const whereClause = pipesArray[pipesArray.length - 1];
      const matches = whereClause.match(new RegExp(fieldName + '(.*)' + String(filterValue)));
      if (matches) {
        const existingOperator = matches[1]?.trim();
        if (existingOperator === operator) {
          return baseESQLQuery;
        } else {
          const existingFilter = `${fieldName}${existingOperator}${filterValue}`;
          const newFilter = `${fieldName}${operator}${filterValue}`;
          return baseESQLQuery.replace(existingFilter, newFilter);
        }
      }
    }
    const whereClause = `and ${fieldName}${operator}${filterValue}`;
    return appendToESQLQuery(baseESQLQuery, whereClause);
  }
  const whereClause = `| where ${fieldName}${operator}${filterValue}`;
  return appendToESQLQuery(baseESQLQuery, whereClause);
}
