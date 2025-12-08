/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BinaryExpressionComparisonOperator } from '@kbn/esql-ast/src/types';

export type SupportedOperators =
  | Extract<BinaryExpressionComparisonOperator, '==' | '!='>
  | 'is not null'
  | 'is null';

export const PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING = [
  'date',
  'date_nanos',
  'version',
  'ip',
  'boolean',
  'number',
  'string',
];

/**
 * Gets the operator and expression type for the given operation
 */
export const getOperator = (
  operation: '+' | '-' | 'is_not_null' | 'is_null'
): { operator: SupportedOperators; expressionType: 'postfix-unary' | 'binary' } => {
  switch (operation) {
    case 'is_not_null':
      return {
        operator: 'is not null',
        expressionType: 'postfix-unary',
      };
    case 'is_null':
      return {
        operator: 'is null',
        expressionType: 'postfix-unary',
      };
    case '-':
      return {
        operator: '!=',
        expressionType: 'binary',
      };
    default:
      return {
        operator: '==',
        expressionType: 'binary',
      };
  }
};

/**
 * Escapes a string value for use in ES|QL queries by escaping backslashes and quotes
 */
export function escapeStringValue(val: string): string {
  return `"${val.replace(/\\/g, '\\\\').replace(/\"/g, '\\"')}"`;
}

// Append in a new line the appended text to take care of the case where the user adds a comment at the end of the query
// in these cases a base query such as "from index // comment" will result in errors or wrong data if we don't append in a new line
export function appendToESQLQuery(baseESQLQuery: string, appendedText: string): string {
  return `${baseESQLQuery}\n${appendedText}`;
}
