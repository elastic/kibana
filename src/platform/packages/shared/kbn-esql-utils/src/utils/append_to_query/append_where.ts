/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFunction } from '@kbn/esql-language';
import { Parser, Walker } from '@kbn/esql-language';
import { sanitazeESQLInput } from '../sanitaze_input';
import {
  getOperator,
  escapeStringValue,
  appendToESQLQuery,
  PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING,
  extractMatchFunctionDetails,
  getSupportedOperators,
  type SupportedOperators,
  type SupportedOperation,
} from './utils';

/**
 * Creates filter expression for both single and multi-value cases
 * For single values, it creates standard comparison expressions
 * For multi-value arrays, it creates MATCH clauses combined with AND/NOT
 */
function createFilterExpression(
  field: string,
  value: unknown,
  operation: SupportedOperation,
  fieldType?: string
): { expression: string; isMultiValue?: boolean } {
  // Handle is not null / is null operations
  if (operation === 'is_not_null' || operation === 'is_null') {
    const fieldName = sanitazeESQLInput(field);
    const operator = operation === 'is_not_null' ? 'is not null' : 'is null';
    return { expression: `${fieldName} ${operator}` };
  }
  // Handle multi-value arrays with MATCH operator
  if (Array.isArray(value)) {
    const fieldName = sanitazeESQLInput(field);
    if (!fieldName) {
      return { expression: '', isMultiValue: true };
    }
    const matchClauses = value.map((val) => {
      const escapedValue = typeof val === 'string' ? escapeStringValue(val) : val;
      return `MATCH(${fieldName}, ${escapedValue})`;
    });

    if (operation === '-') {
      return {
        expression: matchClauses.map((clause) => `NOT ${clause}`).join(' AND '),
        isMultiValue: true,
      };
    }
    return { expression: matchClauses.join(' AND '), isMultiValue: true };
  }

  // Handle single values with standard operators
  const { operator } = getOperator(operation);

  const filterValue = typeof value === 'string' ? escapeStringValue(value) : value;
  let fieldName = sanitazeESQLInput(field);

  if (!fieldName) {
    return { expression: '', isMultiValue: false };
  }

  if (fieldType === undefined || !PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING.includes(fieldType)) {
    fieldName = `${fieldName}::string`;
  }

  return { expression: `${fieldName} ${operator} ${filterValue}`.trim(), isMultiValue: false };
}
/**
 * Handles existing filters in the WHERE clause by checking if the filter exists,
 * updating the operator if necessary, or appending a new filter.
 */
function handleExistingFilter(
  fullQuery: string,
  commandText: string,
  field: string,
  operation: SupportedOperation,
  value: unknown,
  filterExpression: string
): string {
  const matches = commandText.match(new RegExp(field + '(.*)' + String(value)));
  if (matches) {
    const { operator } = getOperator(operation);
    const existingOperator = matches[1]?.trim().replace('`', '').toLowerCase();
    if (existingOperator === operator.trim()) {
      // not changing anything
      return fullQuery;
    }
    if (!getSupportedOperators().includes(existingOperator.trim() as SupportedOperators)) {
      return appendToESQLQuery(fullQuery, `AND ${filterExpression}`);
    }
    const existingFilter = matches[0].trim();
    const newFilter = existingFilter.replace(existingOperator, operator);
    return fullQuery.replace(existingFilter, newFilter);
  }
  return appendToESQLQuery(fullQuery, `AND ${filterExpression}`);
}

/**
 * Handles existing multi-value filters in the WHERE clause by checking existing MATCH functions
 * and determining whether to keep existing filters, negate them, or append new ones.
 */
function handleExistingFilterForMultiValues(
  baseESQLQuery: string,
  lastWhereCommand: any,
  field: string,
  value: unknown,
  operation: SupportedOperation,
  filterExpression: string
): string {
  const existingMatchFunctionsList = Walker.findAll(
    lastWhereCommand,
    (node) => node.type === 'function' && node.name === 'match'
  );

  // Gather the values used in MATCH functions
  const existingValues: string[] = [];
  existingMatchFunctionsList.forEach((matchFunction) => {
    const details = extractMatchFunctionDetails(matchFunction as ESQLFunction);
    if (
      details &&
      details.columnName === field &&
      Array.isArray(value) &&
      value.includes(details.literalValue)
    ) {
      existingValues.push(details.literalValue);
    }
  });

  // Check if all values in the array already exist as filters
  const allValuesExist =
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((val) => existingValues.includes(String(val)));

  if (allValuesExist) {
    if (operation === '+') {
      // All positive filters already exist, no changes needed
      return baseESQLQuery;
    } else if (operation === '-') {
      // All negative filters exist as positive - need to negate them
      let updatedQuery = baseESQLQuery;

      const matchesToNegate: string[] = [];
      existingMatchFunctionsList.forEach((matchFunction) => {
        const details = extractMatchFunctionDetails(matchFunction as ESQLFunction);
        if (
          details &&
          details.columnName === field &&
          Array.isArray(value) &&
          value.includes(details.literalValue)
        ) {
          const fieldName = sanitazeESQLInput(field);
          const escapedValue = escapeStringValue(details.literalValue);
          const matchString = `MATCH(${fieldName}, ${escapedValue})`;
          matchesToNegate.push(matchString);
        }
      });

      // Replace each MATCH function with NOT MATCH
      matchesToNegate.forEach((matchString) => {
        updatedQuery = updatedQuery.replace(matchString, `NOT ${matchString}`);
      });

      return updatedQuery;
    }
  }

  return appendToESQLQuery(baseESQLQuery, `AND ${filterExpression}`);
}

/**
 * Appends a WHERE clause to an existing ES|QL query string.
 * @param baseESQLQuery the base ES|QL query to append the WHERE clause to.
 * @param field the field to filter on.
 * @param value the value to filter by.
 * @param operation the operation to perform ('+', '-', 'is_not_null', 'is_null').
 * @param fieldType the type of the field being filtered (optional).
 * @returns the modified ES|QL query string with the appended WHERE clause, or undefined if no changes were made.
 */
export function appendWhereClauseToESQLQuery(
  baseESQLQuery: string,
  field: string,
  value: unknown,
  operation: SupportedOperation,
  fieldType?: string
): string | undefined {
  const { root } = Parser.parse(baseESQLQuery);
  const lastCommand = root.commands[root.commands.length - 1];
  const isLastCommandWhere = lastCommand.name === 'where';

  const { expression: filterExpression, isMultiValue } = createFilterExpression(
    field,
    value,
    operation,
    fieldType
  );

  if (!filterExpression) {
    return baseESQLQuery;
  }

  if (!isLastCommandWhere) {
    return appendToESQLQuery(baseESQLQuery, `| WHERE ${filterExpression}`);
  }

  // if where command already exists in the end of the query:
  // - we need to append with and if the filter doesn't exist
  // - we need to change the filter operator if the filter exists with different operator
  // - we do nothing if the filter exists with the same operator
  const whereAstText = lastCommand.text;

  const pipesArray = baseESQLQuery.split('|');
  const whereClause = pipesArray[pipesArray.length - 1];

  // Handles is not null / is null operations
  if (operation === 'is_not_null' || operation === 'is_null') {
    return handleExistingFilter(baseESQLQuery, whereClause, field, operation, '', filterExpression);
  }

  // Handles multi-value filters
  if (isMultiValue) {
    return handleExistingFilterForMultiValues(
      baseESQLQuery,
      lastCommand,
      field,
      value,
      operation as '+' | '-',
      filterExpression
    );
  }
  // Handles single value filters
  const filterValue = typeof value === 'string' ? escapeStringValue(value) : value;

  const shouldCheckFilterValue = whereAstText.includes(String(filterValue));
  if (whereAstText.includes(field) && shouldCheckFilterValue) {
    return handleExistingFilter(
      baseESQLQuery,
      whereClause,
      field,
      operation,
      filterValue,
      filterExpression
    );
  }

  return appendToESQLQuery(baseESQLQuery, `AND ${filterExpression}`);
}
