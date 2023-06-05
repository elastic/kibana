/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMappingProperties } from '../mapping_definition';
import type { SavedObjectModelDataBackfillFn } from './transformations';

/**
 * Represents a change of model associated with a given {@link SavedObjectsModelVersion}.
 *
 * The existing types of model changes are:
 *   - 'mappings_addition' ({@link SavedObjectsModelMappingsAdditionChange}
 *   - 'mappings_deprecation' ({@link SavedObjectsModelMappingsDeprecationChange}
 *   - 'data_backfill' ({@link SavedObjectsModelDataBackfillChange}
 *
 * @public
 */
export type SavedObjectsModelChange =
  | SavedObjectsModelMappingsAdditionChange
  | SavedObjectsModelMappingsDeprecationChange
  | SavedObjectsModelDataBackfillChange;

/**
 * A {@link SavedObjectsModelChange | model change} adding new mappings.
 *
 * @example
 * ```ts
 * let change: SavedObjectsModelMappingsAdditionChange = {
 *   type: 'mappings_addition',
 *   addedMappings: {
 *     newField: { type: 'text' },
 *     existingNestedField: {
 *       properties: {
 *         newNestedProp: { type: 'keyword' },
 *       },
 *     },
 *   },
 * };
 * ```
 *
 * @remark when adding mappings, {@link SavedObjectsType.mappings | the type mappings} must also be updated accordingly.
 *         Overall, the type's mapping represents the latest version of the mappings, where the model changes
 *         represent the changes of mappings between two versions.
 *
 * @public
 */
export interface SavedObjectsModelMappingsAdditionChange {
  type: 'mappings_addition';
  /**
   * The new mappings introduced in this version.
   */
  addedMappings: SavedObjectsMappingProperties;
}

/**
 * A {@link SavedObjectsModelChange | model change} flagging mappings as being no longer used.
 *
 * @example
 * ```ts
 * let change: SavedObjectsModelMappingsDeprecationChange = {
 *   type: 'mappings_deprecation',
 *   deprecatedMappings: ['someDeprecatedField', 'someNested.deprecatedField'],
 * };
 * ```
 *
 * @remark Deprecated mappings will eventually be deleted later.
 */
export interface SavedObjectsModelMappingsDeprecationChange {
  type: 'mappings_deprecation';
  /**
   * A list of paths to mappings to flag as deprecated.
   */
  deprecatedMappings: string[];
}

/**
 * A {@link SavedObjectsModelChange | model change} used to backfill fields introduced in the same model version.
 *
 * @example
 * ```
 * let change: SavedObjectsModelDataBackfillChange = {
 *   type: 'data_backfill',
 *   transform: (document) => {
 *     document.attributes.someAddedField = 'defaultValue';
 *     return { document };
 *   },
 * };
 * ```
 *
 * @remark This type of model change should only be used to backfill newly introduced fields.
 *         Even if no check is performed to ensure that, using such transformations to mutate
 *         existing data of the document can lead to data corruption or inconsistency.
 */
export interface SavedObjectsModelDataBackfillChange<
  PreviousAttributes = any,
  NewAttributes = any
> {
  type: 'data_backfill';
  /**
   * The backfill function to run.
   */
  transform: SavedObjectModelDataBackfillFn<PreviousAttributes, NewAttributes>;
}
