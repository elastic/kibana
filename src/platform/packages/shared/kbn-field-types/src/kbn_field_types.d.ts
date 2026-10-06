/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnFieldType } from './kbn_field_type';
import type { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';
/**
 *  Get a type object by name
 *
 *  @param  {string} typeName
 *  @return {KbnFieldType}
 */
export declare const getKbnFieldType: (typeName: string) => KbnFieldType;
/**
 *  Get the esTypes known by all kbnFieldTypes
 *
 *  @return {Array<string>}
 */
export declare const getKbnTypeNames: () => string[];
/**
 *  Get the KbnFieldType name for an esType string
 *
 *  @param {string} esType
 *  @return {string}
 */
export declare const castEsToKbnFieldTypeName: (esType: ES_FIELD_TYPES | string) => KBN_FIELD_TYPES;
/**
 *  Get filterable KbnFieldTypes
 *
 *  @return {Array<string>}
 */
export declare const getFilterableKbnTypeNames: () => string[];
export declare function esFieldTypeToKibanaFieldType(type: string): KBN_FIELD_TYPES;
