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

import { createKbnFieldTypes } from './kbn_field_types_factory';
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
export const getKbnFieldType = (typeName: string): KbnFieldType | undefined =>
  registeredKbnTypes.find((t) => t.name === typeName);

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
