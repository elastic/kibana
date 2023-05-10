/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
/**
 * Returns a tuple of values according to the `esType` param, these values are meant to be applied in the _missing_
 * property of the query aggregation of the grouping, to look up for missing values in the response buckets.
 * These values do not need to be anything in particular, the only requirement is they have to be 2 different values that validate against the field type.
 */
export function getFieldTypeMissingValues(esType: string[]): [number, number] | [string, string] {
  const knownType: ES_FIELD_TYPES = esType[0] as ES_FIELD_TYPES;
  switch (knownType) {
    case ES_FIELD_TYPES.BYTE:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.SHORT:
    case ES_FIELD_TYPES.UNSIGNED_LONG:
    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      return [0, 1];
    case ES_FIELD_TYPES.IP:
      return ['0.0.0.0', '::'];
    default:
      return ['-', '--'];
  }
}

export const getEmptyValue = () => '—';
