/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum SuggestionCategory {
  CRITICAL_ACTION = 'critical_action',
  USER_DEFINED_COLUMN = 'user_defined_column',
  TIME_PARAM = 'time_param',
  RECOMMENDED_FIELD = 'recommended_field',
  ECS_FIELD = 'ecs_field',
  TIME_FIELD = 'time_field',
  FIELD = 'field',

  OPERATOR_COMPARISON = 'operator_comparison',
  OPERATOR_NULL_CHECK = 'operator_null_check',
  OPERATOR_IN = 'operator_in',
  OPERATOR_PATTERN = 'operator_pattern',
  OPERATOR_ARITHMETIC = 'operator_arithmetic',
  OPERATOR_LOGICAL = 'operator_logical',
  OPERATOR = 'operator', // Fallback for unrecognized operators

  FUNCTION_TIME_SERIES_AGG = 'function_ts_agg',
  FUNCTION_AGG = 'function_agg',
  FUNCTION_SCALAR = 'function_scalar',
  PROCESSING_COMMAND = 'processing_command',
  KEYWORD = 'keyword',
  PIPE = 'pipe',
  COMMA = 'comma',
  UNKNOWN = 'unknown',
}

export interface SortingContext {
  command: string;
}
