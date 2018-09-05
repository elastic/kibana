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

import { determineMigrationAction, MigrationAction } from './determine_migration_action';
import * as Index from './elastic_index';
import { migrateRawDocs } from './migrate_raw_docs';
import { Context, migrationContext, MigrationOpts } from './migration_context';
import { coordinateMigration, MigrationResult } from './migration_coordinator';

/*
 * Core logic for migrating the mappings and documents in an index.
 */
export class IndexMigrator {
  private opts: MigrationOpts;

  /**
   * Creates an instance of IndexMigrator.
   *
   * @param {MigrationOpts} opts
   */
  constructor(opts: MigrationOpts) {
    this.opts = opts;
  }

  /**
   * Migrates the index, or, if another Kibana instance appears to be running the migration,
   * waits for the migration to complete.
   *
   * @returns {Promise<MigrationResult>}
   */
  public async migrate(): Promise<MigrationResult> {
    const context = await migrationContext(this.opts);

    return coordinateMigration({
      log: context.log,

      pollInterval: context.pollInterval,

      async isMigrated() {
        const action = await requiredAction(context);
        return action === MigrationAction.None;
      },

      async runMigration() {
        const action = await requiredAction(context);

        if (action === MigrationAction.None) {
          return { status: 'skipped' };
        }

        if (action === MigrationAction.Patch) {
          return patchSourceMappings(context);
        }

        return migrateIndex(context);
      },
    });
  }
}

/**
 * Determines what action the migration system needs to take (none, patch, migrate).
 */
async function requiredAction(context: Context): Promise<MigrationAction> {
  const { callCluster, alias, documentMigrator, dest } = context;

  const hasMigrations = await Index.migrationsUpToDate(
    callCluster,
    alias,
    documentMigrator.migrationVersion
  );

  if (!hasMigrations) {
    return MigrationAction.Migrate;
  }

  const refreshedSource = await Index.fetchInfo(callCluster, alias);

  if (!refreshedSource.aliases[alias]) {
    return MigrationAction.Migrate;
  }

  return determineMigrationAction(refreshedSource.mappings, dest.mappings);
}

/**
 * Applies the latest mappings to the index.
 */
async function patchSourceMappings(context: Context): Promise<MigrationResult> {
  const { callCluster, log, source, dest } = context;

  log.info(`Patching ${source.indexName} mappings`);

  await Index.putMappings(callCluster, source.indexName, dest.mappings);

  return { status: 'patched' };
}

/**
 * Performs an index migration if the source index exists, otherwise
 * this simply creates the dest index with the proper mappings.
 */
async function migrateIndex(context: Context): Promise<MigrationResult> {
  const startTime = Date.now();
  const { callCluster, alias, source, dest, log } = context;

  log.info(`Creating index ${dest.indexName}.`);

  await Index.createIndex(callCluster, dest.indexName, dest.mappings);

  await migrateSourceToDest(context);

  log.info(`Pointing alias ${alias} to ${dest.indexName}.`);

  await Index.claimAlias(callCluster, dest.indexName, alias);

  const result: MigrationResult = {
    status: 'migrated',
    destIndex: dest.indexName,
    sourceIndex: source.indexName,
    elapsedMs: Date.now() - startTime,
  };

  log.info(`Finished in ${result.elapsedMs}ms.`);

  return result;
}

/**
 * Moves all docs from sourceIndex to destIndex, migrating each as necessary.
 * This moves documents from the concrete index, rather than the alias, to prevent
 * a situation where the alias moves out from under us as we're migrating docs.
 */
async function migrateSourceToDest(context: Context) {
  const { callCluster, alias, dest, source, batchSize } = context;
  const { scrollDuration, documentMigrator, log } = context;

  if (!source.exists) {
    return;
  }

  if (!source.aliases[alias]) {
    log.info(`Reindexing ${alias} to ${source.indexName}`);

    await Index.convertToAlias(callCluster, source, alias);
  }

  const read = Index.reader(callCluster, source.indexName, { batchSize, scrollDuration });

  log.info(`Migrating ${source.indexName} saved objects to ${dest.indexName}`);

  while (true) {
    const docs = await read();

    if (!docs || !docs.length) {
      return;
    }

    log.debug(`Migrating saved objects ${docs.map(d => d._id).join(', ')}`);

    await Index.write(callCluster, dest.indexName, migrateRawDocs(documentMigrator.migrate, docs));
  }
}
