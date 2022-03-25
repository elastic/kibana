/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType } from '@kbn/config-schema';

/**
 * Allows for validating properties using @kbn/config-schema validations.
 *
 * @public
 */
export type SavedObjectsValidationSpec = ObjectType;

/**
 * A map of {@link SavedObjectsValidationSpec | validation specs} to be used for a given type.
 * The map's keys must be valid semver versions.
 *
 * Any time you change the schema of a {@link SavedObjectsType}, you should add a new entry
 * to this map for the Kibana version the change was introduced in.
 *
 * @example
 * ```typescript
 * const validationMap: SavedObjectsValidationMap = {
 *   '1.0.0': schema.object({
 *     foo: schema.string(),
 *   }),
 *   '2.0.0': schema.object({
 *     foo: schema.string({
 *       minLength: 2,
 *       validate(value) {
 *         if (!/^[a-z]+$/.test(value)) {
 *           return 'must be lowercase letters only';
 *         }
 *       }
 *     }),
 *   }),
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsValidationMap {
  [version: string]: SavedObjectsValidationSpec;
}
