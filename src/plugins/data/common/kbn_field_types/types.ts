/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
  KEYWORD = 'keyword',

  BOOLEAN = 'boolean',
  OBJECT = 'object',

  DATE = 'date',
  DATE_NANOS = 'date_nanos',

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

  NESTED = 'nested',
  BYTE = 'byte',
  IP = 'ip',
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
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  IP = 'ip',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  STRING = 'string',
  UNKNOWN = 'unknown',
  CONFLICT = 'conflict',
  OBJECT = 'object',
  NESTED = 'nested',
  HISTOGRAM = 'histogram',
}
