/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// NOTE: trick to mark exports as deprecated (only for constants and types, but not for interfaces, classes or enums)
import {
  castEsToKbnFieldTypeName as oldCastEsToKbnFieldTypeName,
  getFilterableKbnTypeNames as oldGetFilterableKbnTypeNames,
  getKbnFieldType as oldGetKbnFieldType,
  getKbnTypeNames as oldGetKbnTypeNames,
  KbnFieldType,
} from '@kbn/field-types';

/**
 * @deprecated Import from the "@kbn/field-types" package directly instead.
 * @removeBy 8.1
 */
const castEsToKbnFieldTypeName = oldCastEsToKbnFieldTypeName;

/**
 * @deprecated Import from the "@kbn/field-types" package directly instead.
 * @removeBy 8.1
 */
const getFilterableKbnTypeNames = oldGetFilterableKbnTypeNames;

/**
 * @deprecated Import from the "@kbn/field-types" package directly instead.
 * @removeBy 8.1
 */
const getKbnFieldType = oldGetKbnFieldType;

/**
 * @deprecated Import from the "@kbn/field-types" package directly instead.
 * @removeBy 8.1
 */
const getKbnTypeNames = oldGetKbnTypeNames;

export {
  castEsToKbnFieldTypeName,
  getKbnFieldType,
  getKbnTypeNames,
  getFilterableKbnTypeNames,
  KbnFieldType,
};
