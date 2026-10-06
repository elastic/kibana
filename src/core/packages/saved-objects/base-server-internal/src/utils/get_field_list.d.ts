/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '../mappings';
export type FieldListMap = Record<string, string[]>;
/**
 * Return the list of fields present in each individual type mappings present in the definition.
 */
export declare const getFieldListMapFromMappingDefinitions: (
  mappings: SavedObjectsTypeMappingDefinitions
) => FieldListMap;
/**
 * Return the list of fields present in the provided mappings.
 * Note that fields only containing properties are still considered fields by this function.
 *
 * @example
 * ```
 * getFieldListFromTypeMapping({
 *   properties: {
 *     foo: {
 *       properties: {
 *         hello: { type: 'text' },
 *         dolly: { type: 'text' },
 *       },
 *     },
 *   },
 * });
 * // ['foo', 'foo.dolly', 'foo.hello']
 * ```
 */
export declare const getFieldListFromTypeMapping: (
  typeMappings: SavedObjectsTypeMappingDefinition
) => string[];
