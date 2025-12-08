/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery, mutate } from '@kbn/esql-ast';
import { sanitazeESQLInput } from '../sanitaze_input';
import {
  getOperator,
  escapeStringValue,
  appendToESQLQuery,
  PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING,
  type SupportedOperators,
} from './utils';

/**
 * Get the list of supported operators dynamically by mapping all possible operation inputs
 */
function getSupportedOperators(): SupportedOperators[] {
  const operations: ('+' | '-' | 'is_not_null' | 'is_null')[] = [
    '+',
    '-',
    'is_not_null',
    'is_null',
  ];
  return operations.map((op) => getOperator(op).operator);
}

/**
 * Creates filter expression for both single and multi-value cases
 * For single values, it creates standard comparison expressions
 * For multi-value arrays, it creates MATCH clauses combined with AND/NOT
 */
function createFilterExpression(
  field: string,
  value: unknown,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  fieldType?: string
): { expression: string; isMultiValue?: boolean } {
  // Handle is not null / is null operations
  if (operation === 'is_not_null' || operation === 'is_null') {
    const fieldName = sanitazeESQLInput(field);
    const operator = operation === 'is_not_null' ? 'is not null' : 'is null';
    return { expression: `${fieldName} ${operator}` };
  }
  // Handle multi-value arrays with MATCH clauses
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

function appendFilter(
  fullQuery: string,
  commandText: string,
  field: string,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  value: unknown,
  filterExpression: string
): string {
  const matches = commandText.match(new RegExp(field + '(.*)' + String(value)));

  // Filter exists, do nothing
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

export function appendWhereClauseToESQLQuery(
  baseESQLQuery: string,
  field: string,
  value: unknown,
  operation: '+' | '-' | 'is_not_null' | 'is_null',
  fieldType?: string
): string | undefined {
  const ESQLQuery = EsqlQuery.fromSrc(baseESQLQuery);
  const whereCommands = Array.from(mutate.commands.where.list(ESQLQuery.ast));

  const { expression: filterExpression, isMultiValue } = createFilterExpression(
    field,
    value,
    operation,
    fieldType
  );

  if (!filterExpression) {
    return baseESQLQuery;
  }

  if (!whereCommands.length) {
    return appendToESQLQuery(baseESQLQuery, `| WHERE ${filterExpression}`);
  }

  // if where command already exists in the end of the query:
  // - we need to append with and if the filter doesn't exist
  // - we need to change the filter operator if the filter exists with different operator
  // - we do nothing if the filter exists with the same operator
  const lastWhereCommand = whereCommands[whereCommands.length - 1];
  const whereAstText = lastWhereCommand.text;

  const pipesArray = baseESQLQuery.split('|');
  const whereClause = pipesArray[pipesArray.length - 1];

  // Handle is not null / is null operations
  if (operation === 'is_not_null' || operation === 'is_null') {
    return appendFilter(baseESQLQuery, whereClause, field, operation, '', filterExpression);
  }

  // HANDLE multi-value filters
  if (isMultiValue) {
    // Append new MATCH clauses
    return appendToESQLQuery(baseESQLQuery, `AND ${filterExpression}`);
  }

  // Single value logic
  const filterValue = typeof value === 'string' ? escapeStringValue(value) : value;

  const shouldCheckFilterValue = whereAstText.includes(String(filterValue));
  if (whereAstText.includes(field) && shouldCheckFilterValue) {
    return appendFilter(
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
