/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLDecimalLiteral, ESQLNumericLiteralType } from '@kbn/esql-ast/src/types';

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
