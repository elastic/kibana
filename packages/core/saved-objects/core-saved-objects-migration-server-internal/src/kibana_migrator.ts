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
import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import type {
  SavedObjectUnsanitizedDoc,
  ISavedObjectTypeRegistry,
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
import { buildActiveMappings, buildTypesMappings } from './core';
import { DocumentMigrator } from './document_migrator';
import { runZeroDowntimeMigration } from './zdt';
import { ALLOWED_CONVERT_VERSION } from './kibana_migrator_constants';
import { runV2Migration } from './run_v2_migration';

export interface KibanaMigratorOptions {
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistry;
  defaultIndexTypesMap: IndexTypesMap;
  hashToVersionMap: Record<string, string>;
  soMigrationsConfig: SavedObjectsMigrationConfigType;
  kibanaIndex: string;
  kibanaVersion: string;
  logger: Logger;
  docLinks: DocLinksServiceStart;
  waitForMigrationCompletion: boolean;
  nodeRoles: NodeRoles;
  esCapabilities: ElasticsearchCapabilities;
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
  private readonly defaultIndexTypesMap: IndexTypesMap;
  private readonly hashToVersionMap: Record<string, string>;
  private readonly serializer: SavedObjectsSerializer;
  private migrationResult?: Promise<MigrationResult[]>;
  private readonly status$ = new BehaviorSubject<KibanaMigratorStatus>({
    status: 'waiting_to_start',
  });
  private readonly activeMappings: IndexMapping;
  private readonly soMigrationsConfig: SavedObjectsMigrationConfigType;
  private readonly docLinks: DocLinksServiceStart;
  private readonly waitForMigrationCompletion: boolean;
  private readonly nodeRoles: NodeRoles;
  private readonly esCapabilities: ElasticsearchCapabilities;

  public readonly kibanaVersion: string;

  /**
   * Creates an instance of KibanaMigrator.
   */
  constructor({
    client,
    typeRegistry,
    kibanaIndex,
    defaultIndexTypesMap,
    hashToVersionMap,
    soMigrationsConfig,
    kibanaVersion,
    logger,
    docLinks,
    waitForMigrationCompletion,
    nodeRoles,
    esCapabilities,
  }: KibanaMigratorOptions) {
    this.client = client;
    this.kibanaIndex = kibanaIndex;
    this.soMigrationsConfig = soMigrationsConfig;
    this.typeRegistry = typeRegistry;
    this.defaultIndexTypesMap = defaultIndexTypesMap;
    this.hashToVersionMap = hashToVersionMap;
    this.serializer = new SavedObjectsSerializer(this.typeRegistry);
    // build mappings.properties for all types, all indices
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
    // we are no longer adding _meta information to the mappings at this level
    // consumers of the exposed mappings are only accessing the 'properties' field
    this.activeMappings = buildActiveMappings(this.mappingProperties);
    this.docLinks = docLinks;
    this.esCapabilities = esCapabilities;
  }

  public getDocumentMigrator() {
    return this.documentMigrator;
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
        esCapabilities: this.esCapabilities,
      });
    } else {
      return runV2Migration({
        kibanaVersion: this.kibanaVersion,
        kibanaIndexPrefix: this.kibanaIndex,
        typeRegistry: this.typeRegistry,
        defaultIndexTypesMap: this.defaultIndexTypesMap,
        hashToVersionMap: this.hashToVersionMap,
        logger: this.log,
        documentMigrator: this.documentMigrator,
        migrationConfig: this.soMigrationsConfig,
        docLinks: this.docLinks,
        serializer: this.serializer,
        elasticsearchClient: this.client,
        mappingProperties: this.mappingProperties,
        waitForMigrationCompletion: this.waitForMigrationCompletion,
        esCapabilities: this.esCapabilities,
      });
    }
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
