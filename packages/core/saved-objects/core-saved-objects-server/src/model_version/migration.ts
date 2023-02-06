/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectSanitizedDoc } from '../serialization';
import type { SavedObjectsMigrationLogger } from '../migration';

/**
 * Document type used during model migration.
 *
 * @public
 */
export type SavedObjectModelMigrationDoc<T = unknown> = SavedObjectSanitizedDoc<T>;

/**
 * Context passed down to {@link SavedObjectModelMigrationFn | migration functions}.
 *
 * @public
 */
export interface SavedObjectModelMigrationContext {
  /**
   * logger instance to be used by the migration handler
   */
  readonly log: SavedObjectsMigrationLogger;
  /**
   * The model version this migration is registered for
   */
  readonly modelVersion: number;
}

/**
 * Return type for the {@link SavedObjectModelMigrationFn | migration functions}
 *
 * @public
 */
export interface SavedObjectModelMigrationResult<DocAttrs = unknown> {
  document: SavedObjectModelMigrationDoc<DocAttrs>;
}

/**
 * Migration function for the model version API.
 *
 * Similar to the old migration system, model version migrations take the document to migrate
 * and a context object as input and must return the transformed document in its return value.
 *
 * @public
 */
export type SavedObjectModelMigrationFn<InputAttributes = unknown, OutputAttributes = unknown> = (
  document: SavedObjectModelMigrationDoc<InputAttributes>,
  context: SavedObjectModelMigrationContext
) => SavedObjectModelMigrationResult<OutputAttributes>;

/**
 * A bidirectional migration.
 *
 * Bidirectional migrations define migration functions that can be used to
 * migrate from the lower version to the higher one (`up`), and the other way around,
 * from the higher version to the lower one (`down`)
 *
 * @public
 */
export interface SavedObjectModelBidirectionalMigration<
  PreviousAttributes = unknown,
  NewAttributes = unknown
> {
  /**
   * The upward (old=>new) migration.
   */
  up: SavedObjectModelMigrationFn<PreviousAttributes, NewAttributes>;
  /**
   * The downward (new=>old) migration.
   */
  down: SavedObjectModelMigrationFn<NewAttributes, PreviousAttributes>;
}
