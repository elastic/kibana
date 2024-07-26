/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const EDITOR_MARKER = 'marker_esql_editor';

export const TICKS_REGEX = /^`{1}|`{1}$/g;
export const DOUBLE_TICKS_REGEX = /``/g;
export const SINGLE_TICK_REGEX = /`/g;
export const SINGLE_BACKTICK = '`';
export const DOUBLE_BACKTICK = '``';

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
