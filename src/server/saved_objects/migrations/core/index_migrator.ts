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
      isMigrated: () => isMigrated(context),
      migrateIndex: () => migrateIndex(context),
    });
  }
}

async function isMigrated({ callCluster, alias, documentMigrator }: Context) {
  return Index.hasMigrations(callCluster, alias, documentMigrator.migrationVersion);
}

async function migrateIndex(context: Context): Promise<MigrationResult> {
  const startTime = Date.now();
  const { callCluster, alias, source, dest, log } = context;

  log.debug(`Checking if migration of ${alias} is required.`);

  if (await isMigrated(context)) {
    log.debug(`Alias ${alias} does not require migration.`);

    await patchSourceMappings(context);

    return { status: 'skipped' };
  }

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
 * Applies the latest mappings to the index.
 */
async function patchSourceMappings(context: Context): Promise<MigrationResult> {
  const { callCluster, log, source, dest } = context;

  log.info(`Patching ${source.indexName} mappings`);

  await Index.putMappings(callCluster, source.indexName, dest.mappings);

  return { status: 'skipped' };
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
