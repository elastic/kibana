/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum KNOWN_FIELD_TYPES {
  BOOLEAN = 'boolean',
  CONFLICT = 'conflict',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  HISTOGRAM = 'histogram',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  KEYWORD = 'keyword',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  NESTED = 'nested',
  STRING = 'string',
  TEXT = 'text',
  VERSION = 'version',
}
