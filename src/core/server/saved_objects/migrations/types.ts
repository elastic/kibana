/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as TaskEither from 'fp-ts/TaskEither';
import type { SavedObjectUnsanitizedDoc } from '../serialization';
import type { SavedObjectsMigrationLogger } from './core';
import { SavedObjectsRawDoc } from '../serialization';
import { DocumentsTransformFailed, DocumentsTransformSuccess } from './core';

/**
 * A migration function for a {@link SavedObjectsType | saved object type}
 * used to migrate it to a given version
 *
 * @example
 * ```typescript
 * interface TypeV1Attributes {
 *   someKey: string;
 *   obsoleteProperty: number;
 * }
 *
 * interface TypeV2Attributes {
 *   someKey: string;
 *   newProperty: string;
 * }
 *
 * const migrateToV2: SavedObjectMigrationFn<TypeV1Attributes, TypeV2Attributes> = (doc, { log }) => {
 *   const { obsoleteProperty, ...otherAttributes } = doc.attributes;
 *   // instead of mutating `doc` we make a shallow copy so that we can use separate types for the input
 *   // and output attributes. We don't need to make a deep copy, we just need to ensure that obsolete
 *   // attributes are not present on the returned doc.
 *   return {
 *     ...doc,
 *     attributes: {
 *       ...otherAttributes,
 *       newProperty: migrate(obsoleteProperty),
 *     },
 *   };
 * };
 * ```
 *
 * @public
 */
export type SavedObjectMigrationFn<InputAttributes = unknown, MigratedAttributes = unknown> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<MigratedAttributes>;

/**
 * Migration context provided when invoking a {@link SavedObjectMigrationFn | migration handler}
 *
 * @public
 */
export interface SavedObjectMigrationContext {
  /**
   * logger instance to be used by the migration handler
   */
  readonly log: SavedObjectsMigrationLogger;
  /**
   * The migration version that this migration function is defined for
   */
  readonly migrationVersion: string;
  /**
   * The version in which this object type is being converted to a multi-namespace type
   */
  readonly convertToMultiNamespaceTypeVersion?: string;
  /**
   * Whether this is a single-namespace type or not
   */
  readonly isSingleNamespaceType: boolean;
}

/**
 * A map of {@link SavedObjectMigrationFn | migration functions} to be used for a given type.
 * The map's keys must be valid semver versions, and they cannot exceed the current Kibana version.
 *
 * For a given document, only migrations with a higher version number than that of the document will be applied.
 * Migrations are executed in order, starting from the lowest version and ending with the highest one.
 *
 * @example
 * ```typescript
 * const migrationsMap: SavedObjectMigrationMap = {
 *   '1.0.0': migrateToV1,
 *   '2.1.0': migrateToV21
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectMigrationMap {
  [version: string]: SavedObjectMigrationFn<any, any>;
}

/** @internal */
export type TransformRawDocs = (
  rawDocs: SavedObjectsRawDoc[]
) => TaskEither.TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess>;

/** @internal */
export type MigrationLogLevel = 'error' | 'info' | 'warning';

/** @internal */
export interface MigrationLog {
  level: MigrationLogLevel;
  message: string;
}

/** @internal */
export interface Progress {
  processed: number | undefined;
  total: number | undefined;
}
