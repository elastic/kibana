/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFunction } from '@kbn/esql-ast';
import { Parser, Walker } from '@kbn/esql-ast';
import { sanitazeESQLInput } from '../sanitaze_input';
import {
  getOperator,
  escapeStringValue,
  appendToESQLQuery,
  PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING,
  extractMatchFunctionDetails,
  extractMvContainsFunctionDetails,
  getSupportedOperators,
  type SupportedOperators,
  type SupportedOperation,
} from './utils';

type MultiValueFilterFunction = 'match' | 'mv_contains';

type FilterExpressionResult =
  | {
      expression: string;
      isMultiValue: false;
    }
  | {
      expression: string;
      isMultiValue: true;
      values: unknown[];
      multiValueFilterFunction: MultiValueFilterFunction;
    };

/**
 * Creates filter expression for multi-value arrays with the following logic:
 * - When `esMappingType` is passed, it uses MV_CONTAINS
 * - Otherwise it uses MATCH clauses combined with AND
 * - Both cases use NOT for negation when the operation is '-'
 */
function buildMultiValueFilterExpression(
  field: string,
  values: unknown[],
  operation: '+' | '-',
  esMappingType?: string
): { expression: string; multiValueFilterFunction: MultiValueFilterFunction } {
  const fieldName = sanitazeESQLInput(field);
  const multiValueFilterFunction = esMappingType ? 'mv_contains' : 'match';

  if (!fieldName) {
    return { expression: '', multiValueFilterFunction };
  }

  const escapedValues = values.map((val) =>
    typeof val === 'string' ? escapeStringValue(val) : val
  );

  // If we have an ES mapping type, we can safely use MV_CONTAINS with casting
  if (esMappingType) {
    const mvContainsValue =
      escapedValues.length === 1 ? escapedValues[0] : `[${escapedValues.join(', ')}]`;
    return {
      expression:
        operation === '-'
          ? `NOT MV_CONTAINS(${fieldName}, ${mvContainsValue}::${esMappingType})`
          : `MV_CONTAINS(${fieldName}, ${mvContainsValue}::${esMappingType})`,
      multiValueFilterFunction,
    };
  }

  // Otherwise we fall back to using MATCH clauses combined with AND
  const matchClauses = escapedValues.map((val) => `MATCH(${fieldName}, ${val})`);
  return {
    expression:
      operation === '-'
        ? matchClauses.map((clause) => `NOT ${clause}`).join(' AND ')
        : matchClauses.join(' AND '),
    multiValueFilterFunction,
  };
}

/**
 * Creates filter expression for both single and multi-value cases
 * For single values, it creates standard comparison expressions
 * For multi-value arrays, it creates MV_CONTAINS or MATCH clauses
 */
function createFilterExpression(
  field: string,
  value: unknown,
  operation: SupportedOperation,
  kibanaFieldType?: string,
  esMappingType?: string
): FilterExpressionResult {
  // Handle is not null / is null operations
  if (operation === 'is_not_null' || operation === 'is_null') {
    const fieldName = sanitazeESQLInput(field);
    const operator = operation === 'is_not_null' ? 'is not null' : 'is null';
    return { expression: `${fieldName} ${operator}`, isMultiValue: false };
  }
  // Handle multi-value arrays with MV_CONTAINS or MATCH
  if (Array.isArray(value)) {
    return {
      isMultiValue: true,
      values: value,
      ...buildMultiValueFilterExpression(field, value, operation, esMappingType),
    };
  }

  // Handle single values with standard operators
  const { operator } = getOperator(operation);

  const filterValue = typeof value === 'string' ? escapeStringValue(value) : value;
  let fieldName = sanitazeESQLInput(field);

  if (!fieldName) {
    return { expression: '', isMultiValue: false };
  }

  if (
    kibanaFieldType === undefined ||
    !PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING.includes(kibanaFieldType)
  ) {
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
 * Gets the original source text for a function expression so replacements preserve casts and formatting
 */
function getFunctionExpressionFromQuery(baseESQLQuery: string, esqlFunction: ESQLFunction) {
  return baseESQLQuery.slice(esqlFunction.location.min, esqlFunction.location.max + 1);
}

/**
 * Handles existing multi-value filters in the WHERE clause by checking existing MATCH or
 * MV_CONTAINS functions and determining whether to keep existing filters, negate them,
 * or append new ones.
 */
function handleExistingFilterForMultiValues(
  baseESQLQuery: string,
  lastWhereCommand: any,
  field: string,
  values: unknown[],
  operation: '+' | '-',
  filterExpression: string,
  multiValueFilterFunction: MultiValueFilterFunction
): string {
  const existingMultiValueFunctions = Walker.findAll(
    lastWhereCommand,
    (node) => node.type === 'function' && node.name === multiValueFilterFunction
  ) as ESQLFunction[];
  const existingFilterExpressions: string[] = [];

  if (multiValueFilterFunction === 'mv_contains') {
    // Check if the MV_CONTAINS function already exists for the selected values
    const existingMvContainsFilter = values.length
      ? existingMultiValueFunctions.find((mvContainsFunction) => {
          const details = extractMvContainsFunctionDetails(mvContainsFunction);
          return (
            details &&
            details.columnName === field &&
            values.every((val) =>
              details.literalValues.some((literalValue) => literalValue === val)
            )
          );
        })
      : undefined;

    if (existingMvContainsFilter) {
      existingFilterExpressions.push(
        getFunctionExpressionFromQuery(baseESQLQuery, existingMvContainsFilter)
      );
    }
  } else {
    // Gather the values used in MATCH functions
    const existingValues: string[] = [];
    const matchingFilterExpressions: string[] = [];

    existingMultiValueFunctions.forEach((matchFunction) => {
      const details = extractMatchFunctionDetails(matchFunction);
      if (details && details.columnName === field && values.includes(details.literalValue)) {
        existingValues.push(details.literalValue);
        matchingFilterExpressions.push(
          getFunctionExpressionFromQuery(baseESQLQuery, matchFunction)
        );
      }
    });

    // Check if all values in the array already exist as filters
    const allValuesExist =
      values.length > 0 && values.every((val) => existingValues.includes(String(val)));
    if (allValuesExist) {
      existingFilterExpressions.push(...matchingFilterExpressions);
    }
  }

  // Append a new filter when the selected values are not already present
  if (existingFilterExpressions.length === 0) {
    return appendToESQLQuery(baseESQLQuery, `AND ${filterExpression}`);
  }

  // All positive filters already exist, no changes needed
  if (operation === '+') {
    return baseESQLQuery;
  }

  // All negative filters exist as positive - need to negate them
  return existingFilterExpressions.reduce(
    (updatedQuery, expression) => updatedQuery.replace(expression, `NOT ${expression}`),
    baseESQLQuery
  );
}

/**
 * Appends a WHERE clause to an existing ES|QL query string.
 * @param baseESQLQuery the base ES|QL query to append the WHERE clause to.
 * @param field the field to filter on.
 * @param value the value to filter by.
 * @param operation the operation to perform ('+', '-', 'is_not_null', 'is_null').
 * @param kibanaFieldType the type of the field being filtered (optional).
 * @param esMappingType the ES mapping type of the field (optional, used to determine whether to use MV_CONTAINS).
 * @returns the modified ES|QL query string with the appended WHERE clause, or undefined if no changes were made.
 */
export function appendWhereClauseToESQLQuery(
  baseESQLQuery: string,
  field: string,
  value: unknown,
  operation: SupportedOperation,
  kibanaFieldType?: string,
  esMappingType?: string
): string | undefined {
  const { root } = Parser.parse(baseESQLQuery);
  const lastCommand = root.commands[root.commands.length - 1];
  const isLastCommandWhere = lastCommand.name === 'where';

  const { expression: filterExpression, ...filterExpressionResult } = createFilterExpression(
    field,
    value,
    operation,
    kibanaFieldType,
    esMappingType
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
  if (filterExpressionResult.isMultiValue) {
    return handleExistingFilterForMultiValues(
      baseESQLQuery,
      lastCommand,
      field,
      filterExpressionResult.values,
      operation,
      filterExpression,
      filterExpressionResult.multiValueFilterFunction
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
