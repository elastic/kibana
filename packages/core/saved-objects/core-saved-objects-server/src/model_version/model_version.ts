/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMappingProperties } from '../mapping_definition';
import type { SavedObjectModelBidirectionalTransformation } from './transformations';

/**
 * Represents a model version of a given savedObjects type.
 *
 * Model versions supersede the {@link SavedObjectsType.migrations | migrations} (and {@link SavedObjectsType.schemas | schemas}) APIs
 * by exposing an unified way of describing the changes of shape or data of a type.
 *
 * @public
 */
export interface SavedObjectsModelVersion {
  /**
   * The {@link SavedObjectsModelChange | changes} associated with this version.
   */
  modelChange: SavedObjectsModelChange;
}

/**
 * {@link SavedObjectsModelChange | model change} representing an expansion.
 *
 * A model expansion can do either, or both, or those:
 * - add new mappings
 * - migrate data in a backward-compatible way
 *
 * @remark when adding mappings, {@link SavedObjectsType.mappings | the type mappings} must also be updated accordingly.
 *         Overall, the type's mapping represents the latests version of the mappings, where the model changes
 *         represent the changes of mappings between two versions.
 *
 * @public
 */
export interface SavedObjectsModelExpansionChange<
  PreviousAttributes = unknown,
  NewAttributes = unknown
> {
  /**
   * The type of {@link SavedObjectsModelChange | change}, used to identify them internally.
   */
  type: 'expansion';
  /**
   * (optional) A bidirectional transformation to migrate the document from and/or to the previous model version.
   */
  transformation?: SavedObjectModelBidirectionalTransformation<PreviousAttributes, NewAttributes>;
  /**
   * (optional) The new mappings introduced in this version.
   */
  addedMappings?: SavedObjectsMappingProperties;
  /**
   * (optional) A list of paths to mappings to flag as deprecated. Deprecated mappings should no longer be used and will
   * eventually be deleted later.
   */
  deprecatedMappings?: string[];
}

/**
 * Identify the model change associated with a given {@link SavedObjectsModelVersion}.
 *
 * At the moment, Only one type of change is supported: {@link SavedObjectsModelExpansionChange | expansions}.
 *
 * @public
 */
export type SavedObjectsModelChange = SavedObjectsModelExpansionChange;

/**
 * A record of {@link SavedObjectsModelVersion | model versions} for a given savedObjects type.
 * The record's keys must be integers, starting with 1 for the first entry, and there shouldn't be gaps.
 *
 * @example
 * ```typescript
 * const modelVersionMap: SavedObjectsModelVersionMap = {
 *   '1': modelVersion1,
 *   '2': modelVersion2,
 *   '3': modelVersion3,
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
