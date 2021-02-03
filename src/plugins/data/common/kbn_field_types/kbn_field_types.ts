/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
