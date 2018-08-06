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

import _ from 'lodash';
import { buildActiveMappings } from './build_active_mappings';
import { CallCluster, IndexMapping, MappingProperties } from './call_cluster';
import { VersionedTransformer } from './document_migrator';
import { ElasticIndex, FullIndexInfo } from './elastic_index';
import { migrateRawDocs } from './migrate_raw_docs';
import { coordinateMigration } from './migration_coordinator';
import { LogFn, Logger, MigrationLogger } from './migration_logger';

type MigrationResult =
  | { status: 'skipped' }
  | {
      status: 'migrated';
      destIndex: string;
      sourceIndex: string;
      elapsedMs: number;
    };

interface MigrationOpts {
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  callCluster: CallCluster;
  index: string;
  log: LogFn;
  mappingProperties: MappingProperties;
  documentMigrator: VersionedTransformer;
}

interface Context {
  sourceIndex: ElasticIndex;
  destIndex: ElasticIndex;
  documentMigrator: VersionedTransformer;
  log: Logger;
  fullMappings: IndexMapping;
  batchSize: number;
  pollInterval: number;
  scrollDuration: string;
  sourceInfo: FullIndexInfo;
}

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
   * Performs the index migration. If the index is already up to date,
   * this still patches the index mappings to ensure they conform to the
   * system's expectations.
   *
   * @returns {Promise<MigrationResult>}
   */
  public async migrate(): Promise<MigrationResult> {
    const context = await migrationContext(this.opts);

    return (await isMigrated(context)) ? patchSourceMappings(context) : migrateIndex(context);
  }
}

/**
 * Builds up an uuber object which has all of the config options, settings,
 * and various info needed to migrate the source index.
 */
async function migrationContext(opts: MigrationOpts): Promise<Context> {
  const { callCluster, index } = opts;
  const log = new MigrationLogger(opts.log);

  log.info(`Loading ${index} index information`);

  const sourceIndex = new ElasticIndex({ callCluster, index });
  const activeMappings = buildActiveMappings({ properties: opts.mappingProperties });
  const sourceInfo = await sourceIndex.fetchInfo();
  const destIndex = new ElasticIndex({
    callCluster,
    index: nextIndexName(sourceIndex.name, sourceInfo.indexName),
  });
  const fullMappings = {
    doc: {
      ...activeMappings.doc,
      properties: {
        ...sourceInfo.mappings.doc.properties,
        ...activeMappings.doc.properties,
      },
    },
  };

  return {
    sourceIndex,
    destIndex,
    log,
    fullMappings,
    sourceInfo,
    documentMigrator: opts.documentMigrator,
    batchSize: opts.batchSize,
    pollInterval: opts.pollInterval,
    scrollDuration: opts.scrollDuration,
  };
}

/**
 * Gets the next index name in a sequence, based on specified current index's info.
 * We're using a numeric counter to create new indices. So, `.kibana_1`, `.kibana_2`, etc
 * There are downsides to this, but it seemed like a simple enough approach.
 */
function nextIndexName(rootName: string, indexName?: string) {
  const indexNum = parseInt(_.first((indexName || rootName).match(/[0-9]+$/) || []), 10) || 0;

  return `${rootName}_${indexNum + 1}`;
}

async function isMigrated(context: Context) {
  return context.sourceIndex.hasMigrations(context.documentMigrator.migrationVersion);
}

/**
 * Applies the latest mappings to the index.
 */
async function patchSourceMappings(context: Context): Promise<MigrationResult> {
  const { log, sourceIndex, fullMappings } = context;

  log.info(`Patching ${sourceIndex} mappings`);
  await sourceIndex.putMappings(fullMappings);
  return { status: 'skipped' };
}

/**
 * Migrates the index, or, if another Kibana instance appears to be running the migration,
 * waits for the migration to complete.
 */
async function migrateIndex(context: Context): Promise<MigrationResult> {
  const { sourceIndex, destIndex, log, pollInterval } = context;
  const startTime = Date.now();

  log.debug(`Coordinating migration from ${sourceIndex} to ${destIndex}`);
  await coordinateMigration({
    log,
    pollInterval,
    isMigrated: () => isMigrated(context),
    runMigration: () => runMigration(context),
  });

  const result: MigrationResult = {
    status: 'migrated',
    sourceIndex: sourceIndex.toString(),
    destIndex: destIndex.toString(),
    elapsedMs: Date.now() - startTime,
  };

  log.info(`Finished migrating ${sourceIndex} saved objects in ${result.elapsedMs}ms`);

  return result;
}

/**
 * Performs the index migration.
 */
async function runMigration(context: Context) {
  const { log, destIndex, sourceIndex, sourceInfo, fullMappings } = context;

  // The index may have been migrated since we last checked, due
  // to race conditions between Kibana instances...
  log.debug(`Checking if ${sourceIndex} is already migrated`);
  if (await isMigrated(context)) {
    return;
  }

  log.info(`Creating index ${destIndex}`);
  await destIndex.create(fullMappings);

  if (sourceInfo.exists) {
    log.debug(`Ensuring ${sourceIndex} is an alias`);
    await sourceIndex.convertToAlias();

    log.info(`Migrating ${sourceIndex} saved objects to ${destIndex}`);
    await migrateDocs(context);
  }

  log.info(`Pointing ${sourceIndex} alias to ${destIndex}`);
  await destIndex.claimAlias(sourceIndex.name);
}

/**
 * Moves all docs from sourceIndex to destIndex, migrating each as necessary.
 */
async function migrateDocs(context: Context) {
  const { destIndex, sourceIndex, batchSize, scrollDuration, documentMigrator, log } = context;
  const read = sourceIndex.reader({ batchSize, scrollDuration });

  while (true) {
    const docs = await read();

    if (!docs || !docs.length) {
      return;
    }

    log.debug(`Migrating saved objects ${docs.map(d => d._id).join(', ')}`);
    await destIndex.write(migrateRawDocs(documentMigrator.migrate, docs));
  }
}
