/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains the logic for managing the Kibana index version
 * (the shape of the mappings and documents in the index).
 */

import { BehaviorSubject } from 'rxjs';
import Semver from 'semver';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectsRawDoc,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectsSerializer,
  type IndexMapping,
  type SavedObjectsTypeMappingDefinitions,
  type SavedObjectsMigrationConfigType,
  type IKibanaMigrator,
  type KibanaMigratorStatus,
  type MigrationResult,
} from '@kbn/core-saved-objects-base-server-internal';
import { buildActiveMappings, buildTypesMappings } from './core';
import { DocumentMigrator, type VersionedTransformer } from './document_migrator';
import { createIndexMap } from './core/build_index_map';
import { runResilientMigrator } from './run_resilient_migrator';
import { migrateRawDocsSafely } from './core/migrate_raw_docs';
import { runZeroDowntimeMigration } from './zdt';

// ensure plugins don't try to convert SO namespaceTypes after 8.0.0
// see https://github.com/elastic/kibana/issues/147344
const ALLOWED_CONVERT_VERSION = '8.0.0';

export interface KibanaMigratorOptions {
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistry;
  soMigrationsConfig: SavedObjectsMigrationConfigType;
  kibanaIndex: string;
  kibanaVersion: string;
  logger: Logger;
  docLinks: DocLinksServiceStart;
  waitForMigrationCompletion: boolean;
}

/**
 * Manages the shape of mappings and documents in the Kibana index.
 */
export class KibanaMigrator implements IKibanaMigrator {
  private readonly client: ElasticsearchClient;
  private readonly documentMigrator: VersionedTransformer;
  private readonly kibanaIndex: string;
  private readonly log: Logger;
  private readonly mappingProperties: SavedObjectsTypeMappingDefinitions;
  private readonly typeRegistry: ISavedObjectTypeRegistry;
  private readonly serializer: SavedObjectsSerializer;
  private migrationResult?: Promise<MigrationResult[]>;
  private readonly status$ = new BehaviorSubject<KibanaMigratorStatus>({
    status: 'waiting_to_start',
  });
  private readonly activeMappings: IndexMapping;
  private readonly soMigrationsConfig: SavedObjectsMigrationConfigType;
  private readonly docLinks: DocLinksServiceStart;
  private readonly waitForMigrationCompletion: boolean;
  public readonly kibanaVersion: string;

  /**
   * Creates an instance of KibanaMigrator.
   */
  constructor({
    client,
    typeRegistry,
    kibanaIndex,
    soMigrationsConfig,
    kibanaVersion,
    logger,
    docLinks,
    waitForMigrationCompletion,
  }: KibanaMigratorOptions) {
    this.client = client;
    this.kibanaIndex = kibanaIndex;
    this.soMigrationsConfig = soMigrationsConfig;
    this.typeRegistry = typeRegistry;
    this.serializer = new SavedObjectsSerializer(this.typeRegistry);
    this.mappingProperties = buildTypesMappings(this.typeRegistry.getAllTypes());
    this.log = logger;
    this.kibanaVersion = kibanaVersion;
    this.documentMigrator = new DocumentMigrator({
      kibanaVersion: this.kibanaVersion,
      convertVersion: ALLOWED_CONVERT_VERSION,
      typeRegistry,
      log: this.log,
    });
    this.waitForMigrationCompletion = waitForMigrationCompletion;
    // Building the active mappings (and associated md5sums) is an expensive
    // operation so we cache the result
    this.activeMappings = buildActiveMappings(this.mappingProperties);
    this.docLinks = docLinks;
  }

  public runMigrations({ rerun = false }: { rerun?: boolean } = {}): Promise<MigrationResult[]> {
    if (this.migrationResult === undefined || rerun) {
      // Reruns are only used by CI / EsArchiver. Publishing status updates on reruns results in slowing down CI
      // unnecessarily, so we skip it in this case.
      if (!rerun) {
        this.status$.next({ status: 'running' });
      }
      this.migrationResult = this.runMigrationsInternal().then((result) => {
        // Similar to above, don't publish status updates when rerunning in CI.
        if (!rerun) {
          this.status$.next({ status: 'completed', result });
        }
        return result;
      });
    }

    return this.migrationResult;
  }

  public prepareMigrations() {
    this.documentMigrator.prepareMigrations();
  }

  public getStatus$() {
    return this.status$.asObservable();
  }

  private runMigrationsInternal(): Promise<MigrationResult[]> {
    const migrationAlgorithm = this.soMigrationsConfig.algorithm;
    if (migrationAlgorithm === 'zdt') {
      return this.runMigrationZdt();
    } else {
      return this.runMigrationV2();
    }
  }

  private runMigrationZdt(): Promise<MigrationResult[]> {
    return runZeroDowntimeMigration({
      kibanaIndexPrefix: this.kibanaIndex,
      typeRegistry: this.typeRegistry,
      logger: this.log,
      documentMigrator: this.documentMigrator,
      migrationConfig: this.soMigrationsConfig,
      docLinks: this.docLinks,
      serializer: this.serializer,
      elasticsearchClient: this.client,
    });
  }

  private runMigrationV2(): Promise<MigrationResult[]> {
    const indexMap = createIndexMap({
      kibanaIndexName: this.kibanaIndex,
      indexMap: this.mappingProperties,
      registry: this.typeRegistry,
    });

    this.log.debug('Applying registered migrations for the following saved object types:');
    Object.entries(this.documentMigrator.migrationVersion)
      .sort(([t1, v1], [t2, v2]) => {
        return Semver.compare(v1, v2);
      })
      .forEach(([type, migrationVersion]) => {
        this.log.debug(`migrationVersion: ${migrationVersion} saved object type: ${type}`);
      });

    const migrators = Object.keys(indexMap).map((index) => {
      return {
        migrate: (): Promise<MigrationResult> => {
          return runResilientMigrator({
            client: this.client,
            kibanaVersion: this.kibanaVersion,
            waitForMigrationCompletion: this.waitForMigrationCompletion,
            targetMappings: buildActiveMappings(indexMap[index].typeMappings),
            logger: this.log,
            preMigrationScript: indexMap[index].script,
            transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) =>
              migrateRawDocsSafely({
                serializer: this.serializer,
                migrateDoc: this.documentMigrator.migrateAndConvert,
                rawDocs,
              }),
            migrationVersionPerType: this.documentMigrator.migrationVersion,
            indexPrefix: index,
            migrationsConfig: this.soMigrationsConfig,
            typeRegistry: this.typeRegistry,
            docLinks: this.docLinks,
          });
        },
      };
    });

    return Promise.all(migrators.map((migrator) => migrator.migrate()));
  }

  public getActiveMappings(): IndexMapping {
    return this.activeMappings;
  }

  public migrateDocument(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    return this.documentMigrator.migrate(doc);
  }
}
