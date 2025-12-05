/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * This file contains the logic for managing the Kibana index version
 * (the shape of the mappings and documents in the index).
 */

import { BehaviorSubject } from 'rxjs';
import { metrics, ValueType } from '@opentelemetry/api';
import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type {
  ElasticsearchCapabilities,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import {
  type IKibanaMigrator,
  type IndexMapping,
  type IndexTypesMap,
  type KibanaMigratorStatus,
  type MigrateDocumentOptions,
  type MigrationResult,
  type SavedObjectsMigrationConfigType,
  SavedObjectsSerializer,
  type SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import { createCummulativeLogger } from './create_cummulative_logger';
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
  /** Specify a minimum supported Kibana version, e.g. '8.18.0' */
  kibanaVersionCheck?: string;
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
  private readonly soMigrationMeter = metrics
    .getMeter('kibana.saved_objects.migrations')
    .createHistogram('kibana.saved_objects.migrations.time', {
      description:
        'Time to run the migration for each index (refer to attribute "kibana.saved_objects.migrations.migrator")',
      unit: 'ms',
      valueType: ValueType.DOUBLE,
    });
  private readonly activeMappings: IndexMapping;
  private readonly soMigrationsConfig: SavedObjectsMigrationConfigType;
  private readonly docLinks: DocLinksServiceStart;
  private readonly waitForMigrationCompletion: boolean;
  private readonly nodeRoles: NodeRoles;
  private readonly esCapabilities: ElasticsearchCapabilities;

  public readonly kibanaVersion: string;
  public readonly kibanaVersionCheck: string | undefined;

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
    kibanaVersionCheck,
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
    this.kibanaVersionCheck = kibanaVersionCheck;
  }

  public getDocumentMigrator() {
    return this.documentMigrator;
  }

  public runMigrations({
    rerun = false,
    skipVersionCheck = false,
  }: { rerun?: boolean; skipVersionCheck?: boolean } = {}): Promise<MigrationResult[]> {
    if (this.migrationResult === undefined || rerun) {
      // Reruns are only used by CI / EsArchiver. Publishing status updates on reruns results in slowing down CI
      // unnecessarily, so we skip it in this case.
      if (!rerun) {
        this.status$.next({ status: 'running' });
      }

      this.migrationResult = this.runMigrationsInternal({ skipVersionCheck }).then((result) => {
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

  private async runMigrationsInternal({
    skipVersionCheck = false,
  }: { skipVersionCheck?: boolean } = {}): Promise<MigrationResult[]> {
    let logger: Logger & { dump?: () => void; clear?: () => void } = this.log;

    if (this.soMigrationsConfig.useCumulativeLogger) {
      logger = createCummulativeLogger(this.log);
    }

    const dumpLogs = () => logger.dump?.();
    process.on('uncaughtExceptionMonitor', dumpLogs);

    try {
      const migrationAlgorithm = this.soMigrationsConfig.algorithm;
      if (migrationAlgorithm === 'zdt') {
        return await runZeroDowntimeMigration({
          kibanaVersion: this.kibanaVersion,
          kibanaIndexPrefix: this.kibanaIndex,
          typeRegistry: this.typeRegistry,
          logger,
          documentMigrator: this.documentMigrator,
          migrationConfig: this.soMigrationsConfig,
          docLinks: this.docLinks,
          serializer: this.serializer,
          elasticsearchClient: this.client,
          nodeRoles: this.nodeRoles,
          esCapabilities: this.esCapabilities,
          meter: this.soMigrationMeter,
        });
      } else {
        return await runV2Migration({
          kibanaVersion: this.kibanaVersion,
          kibanaIndexPrefix: this.kibanaIndex,
          typeRegistry: this.typeRegistry,
          defaultIndexTypesMap: this.defaultIndexTypesMap,
          hashToVersionMap: this.hashToVersionMap,
          logger,
          documentMigrator: this.documentMigrator,
          migrationConfig: this.soMigrationsConfig,
          docLinks: this.docLinks,
          serializer: this.serializer,
          elasticsearchClient: this.client,
          mappingProperties: this.mappingProperties,
          waitForMigrationCompletion: this.waitForMigrationCompletion,
          esCapabilities: this.esCapabilities,
          kibanaVersionCheck: skipVersionCheck ? undefined : this.kibanaVersionCheck,
          meter: this.soMigrationMeter,
        });
      }
    } catch (error) {
      dumpLogs();
      throw error;
    } finally {
      process.removeListener('uncaughtExceptionMonitor', dumpLogs);
      logger.clear?.();
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
