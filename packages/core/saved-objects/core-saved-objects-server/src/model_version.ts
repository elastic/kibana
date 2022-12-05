/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectMigrationContext } from './migration';
import type { SavedObjectUnsanitizedDoc } from './serialization';
import type { SavedObjectsMappingProperties } from './mapping_definition';

/**
 * Root structure defining a model version for a given saved object type.
 *
 * model version are mostly described by the operations necessary to evolve the model from the prior to the next
 * version, and going through the temporary version.
 */
export interface SavedObjectsModelVersion<
  PreviousAttrs = unknown,
  CompatAttrs = unknown,
  NextAttrs = unknown
> {
  expand: SavedObjectsModelVersionExpand<PreviousAttrs, CompatAttrs>;
  contract: SavedObjectsModelVersionContract<CompatAttrs, NextAttrs>;
}

export interface SavedObjectsModelVersionExpand<PreviousAttrs = unknown, CompatAttrs = unknown> {
  /**
   * An (optional) list of new fields that will be added to the mapping during the expand phase.
   */
  addedMappings?: SavedObjectsMappingProperties;
  /**
   * An (optional) bidirectional migration to migrate the data from the previous to the compatibility state.
   */
  migration?: SavedObjectModelMigration<PreviousAttrs, CompatAttrs>;
}

export interface SavedObjectsModelVersionContract<CompatAttrs = unknown, NextAttrs = unknown> {
  /**
   * An (optional) list of paths to mappings that needs to be deleted during the contract phase.
   */
  removedMappings?: string[];
  /**
   * An (optional) bidirectional migration to migrate the data from the compatibility to the final state.
   */
  migration?: SavedObjectModelMigration<CompatAttrs, NextAttrs>;
}

/**
 * Defines a bidirectional (previous->next AND next->previous) model migration.
 */
export interface SavedObjectModelMigration<PreviousAttrs = unknown, NextAttrs = unknown> {
  /**
   * The migration function to migrate the document from the previous to the next version.
   */
  up: SavedObjectModelMigrationFn<PreviousAttrs, NextAttrs>;
  /**
   * The migration function to migrate the document from the next to the previous version.
   */
  down: SavedObjectModelMigrationFn<NextAttrs, PreviousAttrs>;
}

/**
 * The same migration function type previously used. Just duplicated it for better isolation
 * if we need to mutate / evolve it.
 */
export type SavedObjectModelMigrationFn<InputAttributes = unknown, MigratedAttributes = unknown> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<MigratedAttributes>;

/** Just a map of model version **/
export interface SavedObjectsModelVersionMap {
  [modelVersion: string]: SavedObjectsModelVersion;
}

/** Just a provider returning a model version map */
export type SavedObjectsModelVersionMapFn = () => SavedObjectsModelVersionMap;
