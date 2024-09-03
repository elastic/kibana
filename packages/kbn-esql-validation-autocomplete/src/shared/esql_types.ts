/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLDecimalLiteral, ESQLLiteral, ESQLNumericLiteralType } from '@kbn/esql-ast/src/types';
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

/**
 *
 * @param type
 * @returns
 */
export function isStringType(type: unknown) {
  return typeof type === 'string' && ['keyword', 'text'].includes(type);
}

export function isNumericType(type: unknown): type is ESQLNumericLiteralType {
  return (
    typeof type === 'string' &&
    [...ESQL_NUMBER_TYPES, 'decimal'].includes(type as (typeof ESQL_NUMBER_TYPES)[number])
  );
}

export function isNumericDecimalType(type: unknown): type is ESQLDecimalLiteral {
  return (
    typeof type === 'string' &&
    ESQL_NUMERIC_DECIMAL_TYPES.includes(type as (typeof ESQL_NUMERIC_DECIMAL_TYPES)[number])
  );
}

/**
 * Compares two types, taking into account literal types
 * @TODO strengthen typing here (remove `string`)
 */
export const compareTypesWithLiterals = (
  a: ESQLLiteral['literalType'] | FunctionParameterType | string,
  b: ESQLLiteral['literalType'] | FunctionParameterType | string
) => {
  if (a === b) {
    return true;
  }
  if (a === 'decimal') {
    return isNumericDecimalType(b);
  }
  if (b === 'decimal') {
    return isNumericDecimalType(a);
  }
  if (a === 'string') {
    return isStringType(b);
  }
  if (b === 'string') {
    return isStringType(a);
  }

  // In Elasticsearch function definitions, time_literal and time_duration are used
  // time_duration is seconds/min/hour interval
  // date_period is day/week/month/year interval
  // time_literal includes time_duration and date_period
  // So they are equivalent AST's 'timeInterval' (a date unit constant: e.g. 1 year, 15 month)
  if (a === 'time_literal' || a === 'time_duration') return b === 'timeInterval';
  if (b === 'time_literal' || b === 'time_duration') return a === 'timeInterval';
  if (a === 'time_literal') return b === 'time_duration';
  if (b === 'time_literal') return a === 'time_duration';

  return false;
};
