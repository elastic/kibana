/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export type ERROR_CODE =
  | 'ERR_FIELD_MISSING'
  | 'ERR_FIELD_FORMAT'
  | 'ERR_INVALID_CHARS'
  | 'ERR_FIRST_CHAR'
  | 'ERR_MIN_LENGTH'
  | 'ERR_MAX_LENGTH'
  | 'ERR_MIN_SELECTION'
  | 'ERR_MAX_SELECTION'
  | 'ERR_LOWERCASE_STRING'
  | 'ERR_JSON_FORMAT'
  | 'ERR_SMALLER_THAN_NUMBER'
  | 'ERR_GREATER_THAN_NUMBER';
