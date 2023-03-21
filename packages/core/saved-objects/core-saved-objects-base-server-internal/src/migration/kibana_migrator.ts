/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '../mappings';

/** @internal */
export interface IKibanaMigrator {
  readonly kibanaVersion: string;

  /**
   * Migrates the mappings and documents in the Kibana index. By default, this will run only
   * once and subsequent calls will return the result of the original call.
   *
   * @param options.rerun - If true, method will run a new migration when called again instead of
   * returning the result of the initial migration. This should only be used when factors external
   * to Kibana itself alter the kibana index causing the saved objects mappings or data to change
   * after the Kibana server performed the initial migration.
   *
   * @remarks When the `rerun` parameter is set to true, no checks are performed to ensure that no migration
   * is currently running. Chained or concurrent calls to `runMigrations({ rerun: true })` can lead to
   * multiple migrations running at the same time. When calling with this parameter, it's expected that the calling
   * code should ensure that the initial call resolves before calling the function again.
   *
   * @returns - A promise which resolves once all migrations have been applied.
   *    The promise resolves with an array of migration statuses, one for each
   *    elasticsearch index which was migrated.
   */
  runMigrations(options?: { rerun?: boolean }): Promise<MigrationResult[]>;

  prepareMigrations(): void;

  getStatus$(): Observable<KibanaMigratorStatus>;

  /**
   * Gets all the index mappings defined by Kibana's enabled plugins.
   */
  getActiveMappings(): IndexMapping;

  /**
   * Migrates an individual doc to the latest version, as defined by the plugin migrations.
   *
   * @param doc - The saved object to migrate
   * @returns `doc` with all registered migrations applied.
   */
  migrateDocument(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc;
}

/** @internal */
export interface KibanaMigratorStatus {
  status: MigrationStatus;
  result?: MigrationResult[];
  waitingIndex?: string;
}

/** @internal */
export type MigrationStatus =
  | 'waiting_to_start'
  | 'waiting_for_other_nodes'
  | 'running'
  | 'completed';

/** @internal */
export type MigrationResult =
  | { status: 'skipped' }
  | { status: 'patched' }
  | {
      status: 'migrated';
      destIndex: string;
      sourceIndex: string;
      elapsedMs: number;
    };
