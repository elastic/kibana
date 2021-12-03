/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ObjectType } from '@kbn/config-schema';

/**
 * The custom validation function if @kbn/config-schema is not a valid solution for your specific plugin requirements.
 *
 * Be careful not to mutate the provided attributes.
 *
 * @example
 * The validation should look something like:
 * ```typescript
 * const myAttributesValidation: SavedObjectsValidationFunction = ({ attributes }) => {
 *   if (typeof attributes.bar !== 'string') {
 *     throw new Error(`[bar]: expected value of type [string] but got [${typeof attributes.bar}]`);
 *   }
 * }
 * ```
 *
 * @public
 */
export type SavedObjectsValidationFunction = (data: { attributes: unknown }) => void;

/**
 * Allowed property validation options: either @kbn/config-schema validations or custom validation functions.
 *
 * See {@link SavedObjectsValidationFunction} for custom validation.
 *
 * @public
 */
export type SavedObjectsValidationSpec = ObjectType | SavedObjectsValidationFunction;

/**
 * A map of {@link SavedObjectsValidationSpec | validation specs} to be used for a given type.
 * The map's keys must be valid semver versions.
 *
 * Any time you change the schema of a {@link SavedObjectsType}, you should add a new entry
 * to this map for the Kibana version the change was introduced in.
 *
 * @example
 * ```typescript
 * const validationMap: SavedObjectValidationMap = {
 *   '1.0.0': schema.object({
 *     foo: schema.string(),
 *   }),
 *   '1.1.0': schema.object({
 *     foo: schema.oneOf([schema.string(), schema.boolean()]),
 *   }),
 *   '2.1.0': ({ attributes }) => {
 *     if (typeof attributes.bar !== 'string') {
 *       throw new Error(`[bar]: expected value of type [string] but got [${typeof data.bar}]`);
 *     }
 *     if (typeof attributes.foo !== 'string' && typeof attributes.foo !== 'boolean') {
 *       throw new Error(`[foo]: expected value of type [string,boolean] but got [${typeof attributes.foo}]`);
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsValidationMap {
  [version: string]: SavedObjectsValidationSpec;
}
