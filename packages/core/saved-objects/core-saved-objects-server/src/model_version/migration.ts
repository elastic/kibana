/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectSanitizedDoc } from '../serialization';
import type { SavedObjectsMigrationLogger } from '../migration';

// alias to more easily adapt later
export type SavedObjectModelMigrationDoc<T = unknown> = SavedObjectSanitizedDoc<T>;

export type SavedObjectModelMigrationFn<InputAttributes = unknown, OutputAttributes = unknown> = (
  doc: SavedObjectModelMigrationDoc<InputAttributes>,
  context: SavedObjectModelMigrationContext
) => SavedObjectModelMigrationDoc<OutputAttributes>;

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

export interface SavedObjectModelBidirectionalMigration<
  PreviousAttributes = unknown,
  NewAttributes = unknown
> {
  up: SavedObjectModelMigrationFn<PreviousAttributes, NewAttributes>;
  down: SavedObjectModelMigrationFn<NewAttributes, PreviousAttributes>;
}
