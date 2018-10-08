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
import {
  Context,
  MigrationAction,
  migrationContext,
  MigrationOpts,
  requiredAction,
} from './migration_context';
import { coordinateMigration, MigrationResult } from './migration_coordinator';

export interface IndexMigrator {
  fetchProgress: () => Promise<number>;
  migrate(): Promise<MigrationResult>;
}

export async function createIndexMigrator(opts: MigrationOpts) {
  const context = await migrationContext(opts);
  return new ConcreteIndexMigrator(context);
}

/*
 * Core logic for migrating the mappings and documents in an index.
 */
class ConcreteIndexMigrator implements IndexMigrator {
  private context: Context;
  private isComplete = false;

  /**
   * Creates an instance of IndexMigrator.
   *
   * @param {Context} context
   */
  constructor(context: Context) {
    this.context = context;
    this.isComplete = context.action !== MigrationAction.Migrate;
  }

  /**
   * Migration progress is a function of how many docs we
   * expect to be in the destination index (or indices, if our migration also
   * includes a reindex of the original). The value is from 0-1, and once it
   * hits 1, all docs are in the destination index (but aliasing, etc may not
   * be complete yet).
   */
  public async fetchProgress() {
    if (this.isComplete) {
      return 1;
    }

    const { callCluster, alias, dest, source, requiresReindex } = this.context;

    async function countDocs(index: string) {
      // If the index doesn't exist yet, we'll get 404 or 503s back from Elasticsearch,
      // so we handle those cases specially.
      const result = await callCluster('count', { index, ignore: [404, 503] });
      return result.count || 0;
    }

    const originalCount = await countDocs(alias);
    const destCount = await countDocs(dest.indexName);
    const reindexCount = requiresReindex ? await countDocs(source.indexName) : 0;
    const expectedCount = requiresReindex ? originalCount * 2 : originalCount;
    const progress = expectedCount === 0 ? 0 : (destCount + reindexCount) / expectedCount;

    // We don't want to return 1 (completed / 100%) because there is still a bit
    // of work to do even if all the docs have been moved. We only want to return
    // 1 when isComplete has been set.
    return Math.min(0.999, progress);
  }

  /**
   * Migrates the index, or, if another Kibana instance appears to be running the migration,
   * waits for the migration to complete.
   *
   * @returns {Promise<MigrationResult>}
   */
  public async migrate(): Promise<MigrationResult> {
    const context = this.context;
    const result = await coordinateMigration({
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

    this.isComplete = true;

    const message =
      result.status === 'skipped' ? 'skipped' : `finished in ${(result as any).elapsedMs}ms`;
    context.log.info(`Migrations ${message}.`);

    return result;
  }
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

  return {
    status: 'migrated',
    destIndex: dest.indexName,
    sourceIndex: source.indexName,
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Moves all docs from sourceIndex to destIndex, migrating each as necessary.
 * This moves documents from the concrete index, rather than the alias, to prevent
 * a situation where the alias moves out from under us as we're migrating docs.
 */
async function migrateSourceToDest(context: Context) {
  const { callCluster, alias, dest, source, requiresReindex, batchSize } = context;
  const { scrollDuration, documentMigrator, log, serializer } = context;

  if (!source.exists) {
    return;
  }

  if (requiresReindex) {
    log.info(`Reindexing ${alias} to ${source.indexName}`);

    await Index.convertToAlias(callCluster, source, alias, batchSize);
  }

  const read = Index.reader(callCluster, source.indexName, { batchSize, scrollDuration });

  log.info(`Migrating ${source.indexName} saved objects to ${dest.indexName}`);

  while (true) {
    const docs = await read();

    if (!docs || !docs.length) {
      return;
    }

    log.debug(`Migrating saved objects ${docs.map(d => d._id).join(', ')}`);

    await Index.write(
      callCluster,
      dest.indexName,
      migrateRawDocs(serializer, documentMigrator.migrate, docs)
    );
  }
}
