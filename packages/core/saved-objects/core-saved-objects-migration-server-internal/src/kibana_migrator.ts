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
import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  MAIN_SAVED_OBJECT_INDEX,
  type SavedObjectUnsanitizedDoc,
  type SavedObjectsRawDoc,
  type ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectsSerializer,
  type IndexMapping,
  type SavedObjectsTypeMappingDefinitions,
  type SavedObjectsMigrationConfigType,
  type IKibanaMigrator,
  type MigrateDocumentOptions,
  type KibanaMigratorStatus,
  type MigrationResult,
  type IndexTypesMap,
} from '@kbn/core-saved-objects-base-server-internal';
import { getIndicesInvolvedInRelocation } from './kibana_migrator_utils';
import { buildActiveMappings, buildTypesMappings } from './core';
import { DocumentMigrator } from './document_migrator';
import { createIndexMap } from './core/build_index_map';
import { runResilientMigrator } from './run_resilient_migrator';
import { migrateRawDocsSafely } from './core/migrate_raw_docs';
import { runZeroDowntimeMigration } from './zdt';
import { createMultiPromiseDefer, indexMapToIndexTypesMap } from './kibana_migrator_utils';
import { ALLOWED_CONVERT_VERSION, DEFAULT_INDEX_TYPES_MAP } from './kibana_migrator_constants';

export interface KibanaMigratorOptions {
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistry;
  soMigrationsConfig: SavedObjectsMigrationConfigType;
  kibanaIndex: string;
  kibanaVersion: string;
  logger: Logger;
  docLinks: DocLinksServiceStart;
  waitForMigrationCompletion: boolean;
  defaultIndexTypesMap?: IndexTypesMap;
  nodeRoles: NodeRoles;
}

/**
 * Manages the shape of mappings and documents in the Kibana index.
 */
export class KibanaMigrator implements IKibanaMigrator {
  private readonly client: ElasticsearchClient;
  private readonly documentMigrator: DocumentMigrator;
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
  private readonly defaultIndexTypesMap: IndexTypesMap;
  private readonly nodeRoles: NodeRoles;
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
    defaultIndexTypesMap = DEFAULT_INDEX_TYPES_MAP,
    waitForMigrationCompletion,
    nodeRoles,
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
    this.nodeRoles = nodeRoles;
    // Building the active mappings (and associated md5sums) is an expensive
    // operation so we cache the result
    this.activeMappings = buildActiveMappings(this.mappingProperties);
    this.docLinks = docLinks;
    this.defaultIndexTypesMap = defaultIndexTypesMap;
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

  private async runMigrationsInternal(): Promise<MigrationResult[]> {
    const migrationAlgorithm = this.soMigrationsConfig.algorithm;
    if (migrationAlgorithm === 'zdt') {
      return await this.runMigrationZdt();
    } else {
      return await this.runMigrationV2();
    }
  }

  private runMigrationZdt(): Promise<MigrationResult[]> {
    return runZeroDowntimeMigration({
      kibanaVersion: this.kibanaVersion,
      kibanaIndexPrefix: this.kibanaIndex,
      typeRegistry: this.typeRegistry,
      logger: this.log,
      documentMigrator: this.documentMigrator,
      migrationConfig: this.soMigrationsConfig,
      docLinks: this.docLinks,
      serializer: this.serializer,
      elasticsearchClient: this.client,
      nodeRoles: this.nodeRoles,
    });
  }

  private async runMigrationV2(): Promise<MigrationResult[]> {
    const indexMap = createIndexMap({
      kibanaIndexName: this.kibanaIndex,
      indexMap: this.mappingProperties,
      registry: this.typeRegistry,
    });

    this.log.debug('Applying registered migrations for the following saved object types:');
    Object.entries(this.documentMigrator.getMigrationVersion())
      .sort(([t1, v1], [t2, v2]) => {
        return Semver.compare(v1, v2);
      })
      .forEach(([type, migrationVersion]) => {
        this.log.debug(`migrationVersion: ${migrationVersion} saved object type: ${type}`);
      });

    // build a indexTypesMap from the info present in tye typeRegistry, e.g.:
    // {
    //   '.kibana': ['typeA', 'typeB', ...]
    //   '.kibana_task_manager': ['task', ...]
    //   '.kibana_cases': ['typeC', 'typeD', ...]
    //   ...
    // }
    const indexTypesMap = indexMapToIndexTypesMap(indexMap);

    // compare indexTypesMap with the one present (or not) in the .kibana index meta
    // and check if some SO types have been moved to different indices
    const indicesWithMovingTypes = await getIndicesInvolvedInRelocation({
      mainIndex: MAIN_SAVED_OBJECT_INDEX,
      client: this.client,
      indexTypesMap,
      logger: this.log,
      defaultIndexTypesMap: this.defaultIndexTypesMap,
    });

    // we create 2 synchronization objects (2 synchronization points) for each of the
    // migrators involved in relocations, aka each of the migrators that will:
    // A) reindex some documents TO other indices
    // B) receive some documents FROM other indices
    // C) both
    const readyToReindexDefers = createMultiPromiseDefer(indicesWithMovingTypes);
    const doneReindexingDefers = createMultiPromiseDefer(indicesWithMovingTypes);

    // build a list of all migrators that must be started
    const migratorIndices = new Set(Object.keys(indexMap));
    // indices involved in a relocation might no longer be present in current mappings
    // but if their SOs must be relocated to another index, we still need a migrator to do the job
    indicesWithMovingTypes.forEach((index) => migratorIndices.add(index));

    const migrators = Array.from(migratorIndices).map((indexName, i) => {
      return {
        migrate: (): Promise<MigrationResult> => {
          const readyToReindex = readyToReindexDefers[indexName];
          const doneReindexing = doneReindexingDefers[indexName];
          // check if this migrator's index is involved in some document redistribution
          const mustRelocateDocuments = !!readyToReindex;

          return runResilientMigrator({
            client: this.client,
            kibanaVersion: this.kibanaVersion,
            mustRelocateDocuments,
            indexTypesMap,
            waitForMigrationCompletion: this.waitForMigrationCompletion,
            // a migrator's index might no longer have any associated types to it
            targetMappings: buildActiveMappings(indexMap[indexName]?.typeMappings ?? {}),
            logger: this.log,
            preMigrationScript: indexMap[indexName]?.script,
            readyToReindex,
            doneReindexing,
            transformRawDocs: (rawDocs: SavedObjectsRawDoc[]) =>
              migrateRawDocsSafely({
                serializer: this.serializer,
                migrateDoc: this.documentMigrator.migrateAndConvert,
                rawDocs,
              }),
            coreMigrationVersionPerType: this.documentMigrator.getMigrationVersion({
              includeDeferred: false,
              migrationType: 'core',
            }),
            migrationVersionPerType: this.documentMigrator.getMigrationVersion({
              includeDeferred: false,
            }),
            indexPrefix: indexName,
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

  public migrateDocument(
    doc: SavedObjectUnsanitizedDoc,
    { allowDowngrade = false }: MigrateDocumentOptions = {}
  ): SavedObjectUnsanitizedDoc {
    return this.documentMigrator.migrate(doc, { allowDowngrade });
  }
}
