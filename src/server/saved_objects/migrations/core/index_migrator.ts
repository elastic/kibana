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
import { IDocumentMigrator } from './document_migrator';
import { ElasticIndex } from './elastic_index';
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
  documentMigrator: IDocumentMigrator;
}

/*
 * Core logic for migrating the mappings and documents in an index.
 */
export class IndexMigrator {
  private sourceIndex: ElasticIndex;
  private documentMigrator: IDocumentMigrator;
  private log: Logger;
  private batchSize: number;
  private scrollDuration: string;
  private pollInterval: number;
  private activeMappings: IndexMapping;
  private callCluster: CallCluster;

  /**
   * Creates an instance of IndexMigrator.
   *
   * @param {MigrationOpts} opts
   */
  constructor(opts: MigrationOpts) {
    this.documentMigrator = opts.documentMigrator;
    this.log = new MigrationLogger(opts.log);
    this.sourceIndex = new ElasticIndex({
      callCluster: opts.callCluster,
      index: opts.index,
    });
    this.batchSize = opts.batchSize;
    this.scrollDuration = opts.scrollDuration;
    this.activeMappings = buildActiveMappings({
      properties: opts.mappingProperties,
    });
    this.pollInterval = opts.pollInterval;
    this.callCluster = opts.callCluster;
  }

  /**
   * Performs the index migration. If the index is already up to date,
   * this still patches the index mappings to ensure they conform to the
   * system's expectations.
   *
   * @returns {Promise<MigrationResult>}
   */
  public async migrate(): Promise<MigrationResult> {
    this.log.info(`Checking ${this.sourceIndex} migration status`);

    if (await this.isMigrated()) {
      return this.patchSourceMappings();
    }

    const startTime = Date.now();
    const { destIndex } = await this.migrateIndex();
    const result: MigrationResult = {
      status: 'migrated',
      sourceIndex: this.sourceIndex.toString(),
      destIndex: destIndex.toString(),
      elapsedMs: Date.now() - startTime,
    };

    this.log.info(`Migrated ${this.sourceIndex} in ${result.elapsedMs}ms`);

    return result;
  }

  private isMigrated = () => {
    return this.sourceIndex.hasMigrations(this.documentMigrator.migrationVersion);
  };

  /**
   * Computes information necessary to migrate the index.
   */
  private async migrationContext() {
    const { callCluster, sourceIndex } = this;
    const sourceInfo = await sourceIndex.fetchInfo();
    const destIndex = new ElasticIndex({
      callCluster,
      index: nextIndexName(sourceIndex.name, sourceInfo.indexName),
    });
    const fullMappings = this.buildFullMappings(sourceInfo.mappings);

    return {
      destIndex,
      sourceInfo,
      fullMappings,
    };
  }

  /**
   * Patches the source index's mappings.
   */
  private async patchSourceMappings(): Promise<MigrationResult> {
    this.log.info(`Patching ${this.sourceIndex} mappings`);

    const { fullMappings } = await this.migrationContext();

    await this.sourceIndex.putMappings(fullMappings);

    return { status: 'skipped' };
  }

  /**
   * Migrates the index, coordinating the migration logic such that it
   * will only run on one Kibana instance at a time.
   */
  private async migrateIndex() {
    const { sourceIndex, log } = this;
    const context = await this.migrationContext();
    const { destIndex, fullMappings, sourceInfo } = context;

    await coordinateMigration({
      isMigrated: this.isMigrated,
      log: this.log,
      pollInterval: this.pollInterval,
      runMigration: async () => {
        // It can happen that the index was not migrated prior to us
        // obtaining the migration lock, but that it is now migrated,
        // as another instance may have obtained the lock first and
        // performed the migration.
        log.info('Re-checking migration status');
        if (await this.isMigrated()) {
          return;
        }

        log.info(`Creating index ${destIndex}`);
        await destIndex.create(fullMappings);

        if (sourceInfo.exists) {
          log.info(`Ensuring ${sourceIndex} is an alias`);
          await sourceIndex.convertToAlias();

          log.info(`Migrating ${sourceIndex} docs to ${destIndex}`);
          await this.migrateDocs(destIndex);
        }

        log.info(`Pointing ${sourceIndex} alias to ${destIndex}`);
        await destIndex.claimAlias(sourceIndex.name);
      },
    });

    return context;
  }

  /**
   * Moves all docs from the source index to the dest index, running each
   * through the appropriate document transforms prior to writing them.
   */
  private async migrateDocs(destIndex: ElasticIndex) {
    const reader = this.sourceIndex.reader({
      batchSize: this.batchSize,
      scrollDuration: this.scrollDuration,
    });

    while (true) {
      const originalDocs = await reader.read();
      if (!originalDocs || !originalDocs.length) {
        return;
      }

      await destIndex.write(originalDocs.map(this.documentMigrator.migrate));
    }
  }

  /**
   * Combines the specified index mappings with the active mappings
   * to produce a merger of the mappings known by the current system
   * with the mappings existant in the source index.
   *
   * @private
   * @param {IndexMapping} indexMappings
   * @returns
   * @memberof IndexMigrator
   */
  private buildFullMappings(indexMappings: IndexMapping) {
    return {
      doc: {
        ...this.activeMappings.doc,
        properties: {
          ...indexMappings.doc.properties,
          ...this.activeMappings.doc.properties,
        },
      },
    };
  }
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
