/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @public **/
export interface KbnFieldTypeOptions {
  sortable: boolean;
  filterable: boolean;
  name: string;
  esTypes: ES_FIELD_TYPES[];
}

/** @public **/
export enum ES_FIELD_TYPES {
  _ID = '_id',
  _INDEX = '_index',
  _SOURCE = '_source',
  _TYPE = '_type',

  STRING = 'string',
  TEXT = 'text',
  MATCH_ONLY_TEXT = 'match_only_text',
  KEYWORD = 'keyword',
  VERSION = 'version',

  BOOLEAN = 'boolean',
  OBJECT = 'object',

  DATE = 'date',
  DATE_NANOS = 'date_nanos',
  DATE_RANGE = 'date_range',

  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',

  FLOAT = 'float',
  HALF_FLOAT = 'half_float',
  SCALED_FLOAT = 'scaled_float',
  DOUBLE = 'double',
  INTEGER = 'integer',
  LONG = 'long',
  SHORT = 'short',
  UNSIGNED_LONG = 'unsigned_long',

  AGGREGATE_METRIC_DOUBLE = 'aggregate_metric_double',

  FLOAT_RANGE = 'float_range',
  DOUBLE_RANGE = 'double_range',
  INTEGER_RANGE = 'integer_range',
  LONG_RANGE = 'long_range',

  NESTED = 'nested',
  BYTE = 'byte',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  ATTACHMENT = 'attachment',
  TOKEN_COUNT = 'token_count',
  MURMUR3 = 'murmur3',

  HISTOGRAM = 'histogram',
}

/** @public **/
export enum KBN_FIELD_TYPES {
  _SOURCE = '_source',
  ATTACHMENT = 'attachment',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  NUMBER_RANGE = 'number_range',
  STRING = 'string',
  UNKNOWN = 'unknown',
  CONFLICT = 'conflict',
  OBJECT = 'object',
  NESTED = 'nested',
  HISTOGRAM = 'histogram',
  MISSING = 'missing',
}
