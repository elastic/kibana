/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type {
  ElasticsearchCapabilities,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import {
  type IKibanaMigrator,
  type IndexMapping,
  type ISavedObjectTypeRegistryInternal,
  type KibanaMigratorStatus,
  type MigrateDocumentOptions,
  type MigrationResult,
  type SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import type { DocumentMigrator } from './document_migrator';
export interface KibanaMigratorOptions {
  client: ElasticsearchClient;
  typeRegistry: ISavedObjectTypeRegistryInternal;
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
export declare class KibanaMigrator implements IKibanaMigrator {
  private readonly client;
  private readonly documentMigrator;
  private readonly kibanaIndex;
  private readonly log;
  private readonly mappingProperties;
  private readonly typeRegistry;
  private readonly hashToVersionMap;
  private readonly serializer;
  private migrationResult?;
  private readonly status$;
  private readonly soMigrationMeter;
  private readonly activeMappings;
  private readonly soMigrationsConfig;
  private readonly docLinks;
  private readonly waitForMigrationCompletion;
  private readonly nodeRoles;
  private readonly esCapabilities;
  readonly kibanaVersion: string;
  readonly kibanaVersionCheck: string | undefined;
  /**
   * Creates an instance of KibanaMigrator.
   */
  constructor({
    client,
    typeRegistry,
    kibanaIndex,
    hashToVersionMap,
    soMigrationsConfig,
    kibanaVersion,
    logger,
    docLinks,
    waitForMigrationCompletion,
    nodeRoles,
    esCapabilities,
    kibanaVersionCheck,
  }: KibanaMigratorOptions);
  getDocumentMigrator(): DocumentMigrator;
  runMigrations({
    rerun,
    skipVersionCheck,
  }?: {
    rerun?: boolean;
    skipVersionCheck?: boolean;
  }): Promise<MigrationResult[]>;
  prepareMigrations(): void;
  getStatus$(): import('rxjs').Observable<KibanaMigratorStatus>;
  private runMigrationsInternal;
  getActiveMappings(): IndexMapping;
  migrateDocument(
    doc: SavedObjectUnsanitizedDoc,
    { allowDowngrade }?: MigrateDocumentOptions
  ): SavedObjectUnsanitizedDoc;
}
