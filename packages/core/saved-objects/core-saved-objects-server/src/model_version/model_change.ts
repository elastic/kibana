/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsMappingProperties } from '../mapping_definition';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectModelUnsafeTransformFn,
} from './transformations';

/**
 * Represents a change of model associated with a given {@link SavedObjectsModelVersion}.
 *
 * The existing types of model changes are:
 *   - 'mappings_addition' ({@link SavedObjectsModelMappingsAdditionChange}
 *   - 'mappings_deprecation' ({@link SavedObjectsModelMappingsDeprecationChange}
 *   - 'data_backfill' ({@link SavedObjectsModelDataBackfillChange}
 *   - 'data_removal' ({@link SavedObjectsModelDataRemovalChange})
 *   - 'unsafe_transform' ({@link SavedObjectsModelUnsafeTransformChange})
 *
 * @remark Please refer to the model version documentation for more details on all change types
 *         and examples of using them for concrete migration usages.
 *
 * @public
 */
export type SavedObjectsModelChange =
  | SavedObjectsModelMappingsAdditionChange
  | SavedObjectsModelMappingsDeprecationChange
  | SavedObjectsModelDataBackfillChange
  | SavedObjectsModelDataRemovalChange
  | SavedObjectsModelUnsafeTransformChange;

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
 * A {@link SavedObjectsModelChange | model change} backfilling fields introduced in the same model version.
 *
 * @example
 * ```ts
 * let change: SavedObjectsModelDataBackfillChange = {
 *   type: 'data_backfill',
 *   backfillFn: (document, ctx) => {
 *     return { attributes: { someAddedField: 'defaultValue' } };
 *   },
 * };
 * ```
 * @remark Combining the document's attributes with the ones returned from the function
 *         will be done using a deep merge policy.
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
  backfillFn: SavedObjectModelDataBackfillFn<PreviousAttributes, NewAttributes>;
}

/**
 * A {@link SavedObjectsModelChange | model change} removing data from all documents of the type.
 *
 * @example
 * ```ts
 * let change: SavedObjectsModelDataRemovalChange = {
 *   type: 'data_removal',
 *   removedAttributePaths: ['someRootAttributes', 'some.nested.attribute'],
 * };
 * ```
 *
 * @remark Due to backward compatibility, field utilization must be stopped in a prior release
 *         before actual data removal (in case of rollback). Please refer to the modelVersion documentation
 *         for more information and examples.
 */
export interface SavedObjectsModelDataRemovalChange {
  type: 'data_removal';
  /**
   * The list of attribute paths to remove.
   */
  removedAttributePaths: string[];
}

/**
 * A {@link SavedObjectsModelChange | model change} executing an arbitrary transformation function.
 *
 * @example
 * ```ts
 * let change: SavedObjectsModelUnsafeTransformChange = {
 *   type: 'unsafe_transform',
 *   transformFn: (document) => {
 *     document.attributes.someAddedField = 'defaultValue';
 *     return { document };
 *   },
 * };
 * ```
 *
 * @remark Such transformations are potentially (well, likely) unsafe, given the migration system will have
 *         no knowledge of which kind of operations will effectively be executed against the documents.
 *         Those should only be used when there's no other way to cover one's migration needs.
 *         Please reach out to the Core team if you think you need to use this, as you theoretically shouldn't.
 */
export interface SavedObjectsModelUnsafeTransformChange<
  PreviousAttributes = any,
  NewAttributes = any
> {
  type: 'unsafe_transform';
  /**
   * The transform function to execute.
   */
  transformFn: SavedObjectModelUnsafeTransformFn<PreviousAttributes, NewAttributes>;
}
