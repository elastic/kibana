/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  SavedObjectTypeRegistry,
  type SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import type { MigratorContext } from '../context';
import { createDocumentMigrator } from './document_migrator';

export type MockedMigratorContext = Omit<MigratorContext, 'elasticsearchClient'> & {
  elasticsearchClient: ElasticsearchClientMock;
  typeRegistry: SavedObjectTypeRegistry;
};

export const createMigrationConfigMock = (
  parts: Partial<SavedObjectsMigrationConfigType> = {}
): SavedObjectsMigrationConfigType => ({
  algorithm: 'zdt',
  batchSize: 1000,
  maxBatchSizeBytes: new ByteSizeValue(1e8),
  maxReadBatchSizeBytes: new ByteSizeValue(1e6),
  pollInterval: 0,
  scrollDuration: '0s',
  skip: false,
  retryAttempts: 5,
  zdt: {
    metaPickupSyncDelaySec: 120,
    runOnRoles: ['migrator'],
  },
  ...parts,
});

export const createContextMock = (
  parts: Partial<MockedMigratorContext> = {}
): MockedMigratorContext => {
  const typeRegistry = new SavedObjectTypeRegistry();

  return {
    kibanaVersion: '8.7.0',
    indexPrefix: '.kibana',
    types: ['foo', 'bar'],
    typeVirtualVersions: {
      foo: '10.1.0',
      bar: '10.2.0',
    },
    documentMigrator: createDocumentMigrator(),
    migrationConfig: createMigrationConfigMock(),
    elasticsearchClient: elasticsearchClientMock.createElasticsearchClient(),
    maxRetryAttempts: 15,
    migrationDocLinks: docLinksServiceMock.createSetupContract().links.kibanaUpgradeSavedObjects,
    typeRegistry,
    serializer: serializerMock.create(),
    deletedTypes: ['deleted-type'],
    batchSize: 1000,
    discardCorruptObjects: false,
    nodeRoles: { migrator: true, ui: false, backgroundTasks: false },
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
    ...parts,
  };
};
