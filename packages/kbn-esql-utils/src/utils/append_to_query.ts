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
  operation: '+' | '-' | '_exists_',
  fieldType?: string
): string {
  let operator;
  switch (operation) {
    case '_exists_':
      operator = ' is not null';
      break;
    case '-':
      operator = '!=';
      break;
    default:
      operator = '==';
  }
  let filterValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
  // Adding the backticks here are they are needed for special char fields
  let fieldName = `\`${field}\``;

  // casting to string
  // there are some field types such as the ip that need
  // to cast in string first otherwise ES will fail
  if (fieldType !== 'string' && fieldType !== 'number' && fieldType !== 'boolean') {
    fieldName = `${fieldName}::string`;
  }

  // checking that the value is not null
  // this is the existence filter
  if (operation === '_exists_') {
    fieldName = `\`${String(field)}\``;
    filterValue = '';
  }

  const { ast } = getAstAndSyntaxErrors(baseESQLQuery);

  const lastCommandIsWhere = ast[ast.length - 1].name === 'where';
  // if where command already exists in the end of the query:
  // - we need to append with and if the filter doesnt't exist
  // - we need to change the filter operator if the filter exists with different operator
  // - we do nothing if the filter exists with the same operator
  if (lastCommandIsWhere) {
    const whereCommand = ast[ast.length - 1];
    const whereAstText = whereCommand.text;
    // the filter already exists in the where clause
    if (whereAstText.includes(field) && whereAstText.includes(String(filterValue))) {
      const pipesArray = baseESQLQuery.split('|');
      const whereClause = pipesArray[pipesArray.length - 1];

      const matches = whereClause.match(new RegExp(field + '(.*)' + String(filterValue)));
      if (matches) {
        const existingOperator = matches[1]?.trim().replace('`', '').toLowerCase();
        if (!['==', '!=', 'is not null'].includes(existingOperator.trim())) {
          return appendToESQLQuery(baseESQLQuery, `and ${fieldName}${operator}${filterValue}`);
        }
        // the filter is the same
        if (existingOperator === operator.trim()) {
          return baseESQLQuery;
          // the filter has different operator
        } else {
          const existingFilter = matches[0].trim();
          const newFilter = existingFilter.replace(existingOperator, operator);
          return baseESQLQuery.replace(existingFilter, newFilter);
        }
      }
    }
    // filter does not exist in the where clause
    const whereClause = `and ${fieldName}${operator}${filterValue}`;
    return appendToESQLQuery(baseESQLQuery, whereClause);
  }
  const whereClause = `| where ${fieldName}${operator}${filterValue}`;
  return appendToESQLQuery(baseESQLQuery, whereClause);
}
