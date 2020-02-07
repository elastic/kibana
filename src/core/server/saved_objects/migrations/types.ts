/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectUnsanitizedDoc } from '../serialization';
import { SavedObjectsMigrationLogger } from './core/migration_logger';

/**
 * A migration function defined for a {@link SavedObjectsType | saved objects type}
 * used to migrate it's {@link SavedObjectUnsanitizedDoc | documents}
 */
export type SavedObjectMigrationFn = (
  doc: SavedObjectUnsanitizedDoc,
  log: SavedObjectsMigrationLogger
) => SavedObjectUnsanitizedDoc;

/**
 * A map of {@link SavedObjectMigrationFn | migration functions} to be used for a given type.
 * The map's keys must be valid semver versions.
 *
 * For a given document, only migrations with a higher version number than that of the document will be applied.
 * Migrations are executed in order, starting from the lowest version and ending with the highest one.
 *
 * @example
 * ```typescript
 * const migrations: SavedObjectMigrationMap = {
 *   '1.0.0': migrateToV1,
 *   '2.1.0': migrateToV21
 * }
 * ```
 *
 * @public
 */
export interface SavedObjectMigrationMap {
  [version: string]: SavedObjectMigrationFn;
}
