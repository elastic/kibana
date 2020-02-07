/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  NESTED = 'nested',
  BYTE = 'byte',
  IP = 'ip',
  ATTACHMENT = 'attachment',
  TOKEN_COUNT = 'token_count',
  MURMUR3 = 'murmur3',
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
}
