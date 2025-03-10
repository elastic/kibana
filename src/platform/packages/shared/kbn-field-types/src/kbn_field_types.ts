/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createKbnFieldTypes, kbnFieldTypeUnknown } from './kbn_field_types_factory';
import { KbnFieldType } from './kbn_field_type';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';

/** @private */
const registeredKbnTypes = createKbnFieldTypes();

/**
 *  Get a type object by name
 *
 *  @param  {string} typeName
 *  @return {KbnFieldType}
 */
export const getKbnFieldType = (typeName: string): KbnFieldType =>
  registeredKbnTypes.find((t) => t.name === typeName) || kbnFieldTypeUnknown;

/**
 *  Get the esTypes known by all kbnFieldTypes
 *
 *  @return {Array<string>}
 */
export const getKbnTypeNames = (): string[] =>
  registeredKbnTypes.filter((type) => type.name).map((type) => type.name);

/**
 *  Get the KbnFieldType name for an esType string
 *
 *  @param {string} esType
 *  @return {string}
 */
export const castEsToKbnFieldTypeName = (esType: ES_FIELD_TYPES | string): KBN_FIELD_TYPES => {
  const type = registeredKbnTypes.find((t) => t.esTypes.includes(esType as ES_FIELD_TYPES));

  return type && type.name ? (type.name as KBN_FIELD_TYPES) : KBN_FIELD_TYPES.UNKNOWN;
};

/**
 *  Get filterable KbnFieldTypes
 *
 *  @return {Array<string>}
 */
export const getFilterableKbnTypeNames = (): string[] =>
  registeredKbnTypes.filter((type) => type.filterable).map((type) => type.name);

export function esFieldTypeToKibanaFieldType(type: string) {
  // 'counter_integer', 'counter_long', 'counter_double'...
  if (type.startsWith('counter_')) {
    return KBN_FIELD_TYPES.NUMBER;
  }
  switch (type) {
    case ES_FIELD_TYPES._INDEX:
      return KBN_FIELD_TYPES.STRING;
    case '_version':
      return KBN_FIELD_TYPES.NUMBER;
    case 'datetime':
      return KBN_FIELD_TYPES.DATE;
    default:
      return castEsToKbnFieldTypeName(type);
  }
}
