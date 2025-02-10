/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsModelVersionSchemaDefinitions } from './schemas';
import type { SavedObjectsModelChange } from './model_change';

/**
 * Represents a model version of a given saved object type.
 *
 * Model versions supersede the {@link SavedObjectsType.migrations | migrations} (and {@link SavedObjectsType.schemas | schemas}) APIs
 * by exposing an unified way of describing the changes of shape or data of a type.
 *
 * @public
 */
export interface SavedObjectsModelVersion {
  /**
   * The list of changes associated with this version.
   *
   * Model version changes are defined via low-level components, allowing to use composition
   * to describe the list of changes bound to a given version.
   *
   * @remark Having multiple changes of the same type in a version's list of change is supported
   *         by design to allow merging different sources.
   *
   * @example Adding a new indexed field with a default value
   * ```ts
   * const version1: SavedObjectsModelVersion = {
   *   changes: [
   *     {
   *       type: 'mappings_addition',
   *       addedMappings: {
   *         someNewField: { type: 'text' },
   *       },
   *     },
   *     {
   *       type: 'data_backfill',
   *       backfillFn: (doc) => {
   *         return { attributes: { someNewField: 'some default value' } };
   *       },
   *     },
   *   ],
   * };
   * ```
   *
   * @example A version with multiple mappings addition coming from different changes
   * ```ts
   * const version1: SavedObjectsModelVersion = {
   *   changes: [
   *     {
   *       type: 'mappings_addition',
   *       addedMappings: {
   *         someNewField: { type: 'text' },
   *       },
   *     },
   *    {
   *       type: 'mappings_addition',
   *       addedMappings: {
   *         anotherNewField: { type: 'text' },
   *       },
   *     },
   *   ],
   * };
   * ```
   *
   * See {@link SavedObjectsModelChange | changes} for more information and examples.
   */
  changes: SavedObjectsModelChange[];
  /**
   * The {@link SavedObjectsModelVersionSchemaDefinitions | schemas} associated with this version.
   *
   * Schemas are used to validate / convert the shape and/or content of the documents at various stages of their usages.
   */
  schemas?: SavedObjectsModelVersionSchemaDefinitions;
}

/**
 * A record of {@link SavedObjectsModelVersion | model versions} for a given savedObjects type.
 * The record's keys must be integers, starting with 1 for the first entry, and there shouldn't be gaps.
 *
 * @example
 * ```typescript
 * const modelVersionMap: SavedObjectsModelVersionMap = {
 *   1: modelVersion1,
 *   2: modelVersion2,
 *   3: modelVersion3,
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectsModelVersionMap {
  [modelVersion: string]: SavedObjectsModelVersion;
}

/**
 * A function returning a {@link SavedObjectsModelVersionMap | model version map}
 *
 * Ensured to be called after all plugins executed their `setup` phase.
 * Similar to what was done with migrations, can be used to defer resolving the model versions
 * associated to a type to after all plugins have been set up.
 *
 * @public
 */
export type SavedObjectsModelVersionMapProvider = () => SavedObjectsModelVersionMap;
