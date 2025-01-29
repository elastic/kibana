/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLLiteral, ESQLNumericLiteralType } from '@kbn/esql-ast/src/types';
import { FunctionParameterType } from '../definitions/types';

export const ESQL_COMMON_NUMERIC_TYPES = ['double', 'long', 'integer'] as const;
export const ESQL_NUMERIC_DECIMAL_TYPES = [
  'double',
  'unsigned_long',
  'long',
  'counter_long',
  'counter_double',
] as const;
export const ESQL_NUMBER_TYPES = [
  'integer',
  'counter_integer',
  ...ESQL_NUMERIC_DECIMAL_TYPES,
] as const;

export const ESQL_STRING_TYPES = ['keyword', 'text'] as const;
export const ESQL_DATE_TYPES = ['datetime', 'date_period'] as const;

export function isNumericType(type: unknown): type is ESQLNumericLiteralType {
  return (
    typeof type === 'string' &&
    [...ESQL_NUMBER_TYPES, 'decimal'].includes(type as (typeof ESQL_NUMBER_TYPES)[number])
  );
}

/**
 * Compares two types, taking into account literal types
 * @TODO strengthen typing here (remove `string`)
 * @TODO — clean up time duration and date period
 */
export const compareTypesWithLiterals = (
  a: ESQLLiteral['literalType'] | FunctionParameterType | 'timeInterval' | string,
  b: ESQLLiteral['literalType'] | FunctionParameterType | 'timeInterval' | string
) => {
  if (a === b) {
    return true;
  }
  // In Elasticsearch function definitions, time_literal and time_duration are used
  // time_duration is seconds/min/hour interval
  // date_period is day/week/month/year interval
  // time_literal includes time_duration and date_period
  // So they are equivalent AST's 'timeInterval' (a date unit constant: e.g. 1 year, 15 month)
  if (a === 'time_literal' || a === 'time_duration' || a === 'date_period')
    return b === 'timeInterval';
  if (b === 'time_literal' || b === 'time_duration' || b === 'date_period')
    return a === 'timeInterval';

  return false;
};
