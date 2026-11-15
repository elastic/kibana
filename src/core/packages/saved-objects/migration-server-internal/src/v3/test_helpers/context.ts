/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  SavedObjectTypeRegistry,
  SavedObjectsSerializer,
  type IndexMapping,
  type SavedObjectsMigrationConfigType,
} from '@kbn/core-saved-objects-base-server-internal';
import { DocumentMigrator } from '../../document_migrator';
import { createContext, type MigrationContext, type MigrationInputs } from '../context';

export const KIBANA_VERSION = '9.4.0';

/** `foo` changed its mappings in its 2nd model version, `bar` has a single model version. */
export const createTestTypes = (): SavedObjectsType[] => [
  {
    name: 'foo',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: { title: { type: 'text' }, description: { type: 'text' } } },
    modelVersions: {
      1: { changes: [] },
      2: {
        changes: [
          { type: 'mappings_addition', addedMappings: { description: { type: 'text' } } },
          {
            type: 'data_backfill',
            backfillFn: () => ({ attributes: { description: 'backfilled' } }),
          },
        ],
      },
    },
  },
  {
    name: 'bar',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: { count: { type: 'integer' } } },
    modelVersions: { 1: { changes: [] } },
  },
];

export const CLASSIC_INPUTS: MigrationInputs = {
  allowDowngrade: false,
  removeOutdatedVersionAliases: true,
  checkClusterRoutingAllocation: true,
  fetchAllocationExplain: true,
  waitForMigrationCompletion: false,
  migrateDocuments: true,
  pickupUpdatedMappings: true,
};

export const SERVERLESS_INPUTS: MigrationInputs = {
  allowDowngrade: true,
  removeOutdatedVersionAliases: false,
  checkClusterRoutingAllocation: false,
  fetchAllocationExplain: false,
  waitForMigrationCompletion: false,
  migrateDocuments: true,
  pickupUpdatedMappings: true,
};

export const createMigrationConfig = (
  parts: Partial<SavedObjectsMigrationConfigType> = {}
): SavedObjectsMigrationConfigType => ({
  algorithm: 'v2',
  batchSize: 1000,
  maxBatchSizeBytes: new ByteSizeValue(1e8),
  maxReadBatchSizeBytes: new ByteSizeValue(1e6),
  pollInterval: 0,
  scrollDuration: '0s',
  skip: false,
  retryAttempts: 5,
  zdt: { metaPickupSyncDelaySec: 120, runOnRoles: ['migrator'] },
  useCumulativeLogger: false,
  ...parts,
});

export interface TestContextParams {
  inputs?: Partial<MigrationInputs>;
  types?: SavedObjectsType[];
  legacyTypes?: string[];
  kibanaVersion?: string;
  minimumPreviousVersion?: string;
  migrationConfig?: Partial<SavedObjectsMigrationConfigType>;
}

/** Builds a real {@link MigrationContext}, with the test types registered in a real type registry. */
export const createTestContext = ({
  inputs = {},
  types = createTestTypes(),
  legacyTypes = ['deleted-type'],
  kibanaVersion = KIBANA_VERSION,
  minimumPreviousVersion,
  migrationConfig = {},
}: TestContextParams = {}): MigrationContext => {
  const typeRegistry = new SavedObjectTypeRegistry({ legacyTypes });
  types.forEach((type) => typeRegistry.registerType(type));
  const documentMigrator = new DocumentMigrator({
    typeRegistry,
    kibanaVersion,
    convertVersion: '8.0.0',
    log: loggingSystemMock.createLogger(),
  });
  documentMigrator.prepareMigrations();

  return createContext({
    inputs: { ...CLASSIC_INPUTS, ...inputs },
    indexPrefix: '.kibana',
    types: types.map(({ name }) => name),
    kibanaVersion,
    minimumPreviousVersion,
    typeRegistry,
    documentMigrator,
    serializer: new SavedObjectsSerializer(typeRegistry),
    migrationConfig: createMigrationConfig(migrationConfig),
    docLinks: docLinksServiceMock.createStartContract(),
    elasticsearchClient: elasticsearchClientMock.createElasticsearchClient(),
    esCapabilities: { serverless: false },
  });
};

/** The mappings of an index last updated by this Kibana, with the given `_meta` overrides. */
export const indexMappingsWith = (
  context: MigrationContext,
  meta: Partial<NonNullable<IndexMapping['_meta']>> = {}
): IndexMapping => ({
  ...context.indexMappings,
  _meta: { ...context.indexMappings._meta, ...meta },
});

export interface TestIndex {
  name?: string;
  aliases?: string[];
  mappings: IndexMapping;
}

/** The response of `fetchIndices` for a single index. */
export const fetchIndicesResponse = ({
  name = '.kibana_1',
  aliases = ['.kibana', `.kibana_${KIBANA_VERSION}`],
  mappings,
}: TestIndex) => ({
  [name]: {
    aliases: Object.fromEntries(aliases.map((alias) => [alias, {}])),
    mappings,
    settings: {},
  },
});
