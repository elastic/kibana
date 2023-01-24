/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldTypeKnown } from '../../types';

/**
 * Field types for which name and description are defined
 * @public
 */
export enum KNOWN_FIELD_TYPES {
  DOCUMENT = 'document', // "Records" on Lens page
  BINARY = 'binary',
  BOOLEAN = 'boolean',
  CONFLICT = 'conflict',
  COUNTER = 'counter',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  DENSE_VECTOR = 'dense_vector',
  GAUGE = 'gauge',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  HISTOGRAM = 'histogram',
  IP = 'ip',
  IP_RANGE = 'ip_range',
  FLATTENED = 'flattened',
  KEYWORD = 'keyword',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  NESTED = 'nested',
  RANK_FEATURE = 'rank_feature',
  RANK_FEATURES = 'rank_features',
  SHAPE = 'shape',
  STRING = 'string',
  TEXT = 'text',
  VERSION = 'version',
}

export const KNOWN_FIELD_TYPE_LIST: string[] = Object.values(KNOWN_FIELD_TYPES);

export const isKnownFieldType = (type?: string): type is FieldTypeKnown => {
  return !!type && KNOWN_FIELD_TYPE_LIST.includes(type);
};
