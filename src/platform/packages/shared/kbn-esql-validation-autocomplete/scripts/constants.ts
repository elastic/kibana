/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Location, FunctionParameterType, FunctionReturnType } from '../src/definitions/types';

export const aliasTable: Record<string, string[]> = {
  to_version: ['to_ver'],
  to_unsigned_long: ['to_ul', 'to_ulong'],
  to_boolean: ['to_bool'],
  to_string: ['to_str'],
  to_datetime: ['to_dt'],
  to_double: ['to_dbl'],
  to_integer: ['to_int'],
};

export const aliases = new Set(Object.values(aliasTable).flat());

// --- Bucket ---
export const bucketParameterTypes: Array<
  [
    FunctionParameterType,
    FunctionParameterType,
    FunctionParameterType | null,
    FunctionParameterType | null,
    FunctionReturnType
  ]
> = [
  // field   // bucket   //from    // to   //result
  // 2-param signatures
  ['date_nanos', 'date_period', null, null, 'date_nanos'],
  ['date', 'date_period', null, null, 'date'],
  ['date_nanos', 'time_literal', null, null, 'date_nanos'],
  ['date', 'time_literal', null, null, 'date'],
  ['double', 'double', null, null, 'double'],
  ['double', 'integer', null, null, 'double'],
  ['integer', 'double', null, null, 'double'],
  ['integer', 'integer', null, null, 'double'],
  ['long', 'double', null, null, 'double'],
  ['long', 'integer', null, null, 'double'],
  // 4-param signatures
  ['date', 'integer', 'date', 'date', 'date'],
  ['date_nanos', 'integer', 'date', 'date', 'date_nanos'],
  ['double', 'integer', 'double', 'double', 'double'],
  ['double', 'integer', 'double', 'integer', 'double'],
  ['double', 'integer', 'double', 'long', 'double'],
  ['double', 'integer', 'integer', 'double', 'double'],
  ['double', 'integer', 'integer', 'integer', 'double'],
  ['double', 'integer', 'integer', 'long', 'double'],
  ['double', 'integer', 'long', 'double', 'double'],
  ['double', 'integer', 'long', 'integer', 'double'],
  ['double', 'integer', 'long', 'long', 'double'],
  ['integer', 'integer', 'double', 'double', 'double'],
  ['integer', 'integer', 'double', 'integer', 'double'],
  ['integer', 'integer', 'double', 'long', 'double'],
  ['integer', 'integer', 'integer', 'double', 'double'],
  ['integer', 'integer', 'integer', 'integer', 'double'],
  ['integer', 'integer', 'integer', 'long', 'double'],
  ['integer', 'integer', 'long', 'double', 'double'],
  ['integer', 'integer', 'long', 'integer', 'double'],
  ['integer', 'integer', 'long', 'long', 'double'],
  ['long', 'integer', 'double', 'double', 'double'],
  ['long', 'integer', 'double', 'integer', 'double'],
  ['long', 'integer', 'double', 'long', 'double'],
  ['long', 'integer', 'integer', 'double', 'double'],
  ['long', 'integer', 'integer', 'integer', 'double'],
  ['long', 'integer', 'integer', 'long', 'double'],
  ['long', 'integer', 'long', 'double', 'double'],
  ['long', 'integer', 'long', 'integer', 'double'],
  ['long', 'integer', 'long', 'long', 'double'],
];

// --- Locations ---
export const defaultScalarFunctionLocations: Location[] = [
  Location.EVAL,
  Location.ROW,
  Location.SORT,
  Location.WHERE,
  Location.STATS,
  Location.STATS_BY,
  Location.STATS_WHERE,
  Location.COMPLETION,
];

export const defaultAggFunctionLocations: Location[] = [Location.STATS];

// --- Dates ---
export const dateDiffSuggestions = [
  'year',
  'quarter',
  'month',
  'week',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
  'microsecond',
  'nanosecond',
];

export const dateDiffOptions = [
  'year',
  'years',
  'yy',
  'yyyy',
  'quarter',
  'quarters',
  'qq',
  'q',
  'month',
  'months',
  'mm',
  'm',
  'dayofyear',
  'dy',
  'y',
  'day',
  'days',
  'dd',
  'd',
  'week',
  'weeks',
  'wk',
  'ww',
  'weekday',
  'weekdays',
  'dw',
  'hour',
  'hours',
  'hh',
  'minute',
  'minutes',
  'mi',
  'n',
  'second',
  'seconds',
  'ss',
  's',
  'millisecond',
  'milliseconds',
  'ms',
  'microsecond',
  'microseconds',
  'mcs',
  'nanosecond',
  'nanoseconds',
  'ns',
];

export const dateExtractOptions = [
  'ALIGNED_DAY_OF_WEEK_IN_MONTH',
  'ALIGNED_DAY_OF_WEEK_IN_YEAR',
  'ALIGNED_WEEK_OF_MONTH',
  'ALIGNED_WEEK_OF_YEAR',
  'AMPM_OF_DAY',
  'CLOCK_HOUR_OF_AMPM',
  'CLOCK_HOUR_OF_DAY',
  'DAY_OF_MONTH',
  'DAY_OF_WEEK',
  'DAY_OF_YEAR',
  'EPOCH_DAY',
  'ERA',
  'HOUR_OF_AMPM',
  'HOUR_OF_DAY',
  'INSTANT_SECONDS',
  'MICRO_OF_DAY',
  'MICRO_OF_SECOND',
  'MILLI_OF_DAY',
  'MILLI_OF_SECOND',
  'MINUTE_OF_DAY',
  'MINUTE_OF_HOUR',
  'MONTH_OF_YEAR',
  'NANO_OF_DAY',
  'NANO_OF_SECOND',
  'OFFSET_SECONDS',
  'PROLEPTIC_MONTH',
  'SECOND_OF_DAY',
  'SECOND_OF_MINUTE',
  'YEAR',
  'YEAR_OF_ERA',
];

// --- Operators ---
export const MATH_OPERATORS = ['add', 'sub', 'div', 'mod', 'mul'];

export const COMPARISON_OPERATORS = [
  'equals',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'not_equals',
];

export const mathOperatorsExtraSignatures = [
  {
    params: [
      { name: 'left', type: 'time_literal' as const },
      { name: 'right', type: 'date' as const },
    ],
    returnType: 'date' as const,
  },
  {
    params: [
      { name: 'left', type: 'date' as const },
      { name: 'right', type: 'time_literal' as const },
    ],
    returnType: 'date' as const,
  },
];

export const comparisonOperatorSignatures = (['ip', 'version'] as const).flatMap((type) => [
  {
    params: [
      { name: 'left', type },
      { name: 'right', type: 'text' as const, constantOnly: true },
    ],
    returnType: 'boolean' as const,
  },
  {
    params: [
      { name: 'left', type: 'text' as const, constantOnly: true },
      { name: 'right', type },
    ],
    returnType: 'boolean' as const,
  },
]);
