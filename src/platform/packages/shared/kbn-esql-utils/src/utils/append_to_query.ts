/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { parse, mutate, BasicPrettyPrinter } from '@kbn/esql-ast';
import { sanitazeESQLInput } from './sanitaze_input';

// Append in a new line the appended text to take care of the case where the user adds a comment at the end of the query
// in these cases a base query such as "from index // comment" will result in errors or wrong data if we don't append in a new line
export function appendToESQLQuery(baseESQLQuery: string, appendedText: string): string {
  return `${baseESQLQuery}\n${appendedText}`;
}

export function appendWhereClauseToESQLQuery(
  baseESQLQuery: string,
  field: string,
  value: unknown,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  fieldType?: string
): string | undefined {
  // multivalues filtering is not supported yet
  if (Array.isArray(value)) {
    return undefined;
  }
  let operator;
  switch (operation) {
    case 'is_not_null':
      operator = ' is not null';
      break;
    case 'is_null':
      operator = ' is null';
      break;
    case '-':
      operator = '!=';
      break;
    default:
      operator = '==';
  }
  let filterValue =
    typeof value === 'string' ? `"${value.replace(/\\/g, '\\\\').replace(/\"/g, '\\"')}"` : value;
  // Adding the backticks here are they are needed for special char fields
  let fieldName = sanitazeESQLInput(field);

  // casting to string
  // there are some field types such as the ip that need
  // to cast in string first otherwise ES will fail
  if (fieldType !== 'string' && fieldType !== 'number' && fieldType !== 'boolean') {
    fieldName = `${fieldName}::string`;
  }

  // checking that the value is not null
  // this is the existence filter
  if (operation === 'is_not_null' || operation === 'is_null') {
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
        if (!['==', '!=', 'is not null', 'is null'].includes(existingOperator.trim())) {
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
    const whereClause = `AND ${fieldName}${operator}${filterValue}`;
    return appendToESQLQuery(baseESQLQuery, whereClause);
  }
  const whereClause = `| WHERE ${fieldName}${operator}${filterValue}`;
  return appendToESQLQuery(baseESQLQuery, whereClause);
}

export const appendStatsByToQuery = (queryString: string, column: string) => {
  const { root } = parse(queryString);
  const lastCommand = root.commands[root.commands.length - 1];
  if (lastCommand.name === 'stats') {
    const statsCommand = lastCommand;
    mutate.generic.commands.remove(root, statsCommand);
    const queryWithoutStats = BasicPrettyPrinter.print(root);
    return `${queryWithoutStats}\n| STATS BY ${column}`;
  } else {
    return `${queryString}\n| STATS BY ${column}`;
  }
};
