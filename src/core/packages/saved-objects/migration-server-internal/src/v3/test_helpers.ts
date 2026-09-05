/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Option from 'fp-ts/Option';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { BulkOperation } from '../model/create_batches';
import type { MigrationBaseState, PostInitState, SourceExistsState } from './migration_state';
import type { StateName, StateOf } from './state';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INIT from './steps/init';
import type { IO } from './io';

export const io = {} as IO;

const indexMapping: IndexMapping = {
  properties: {
    config: {
      properties: {
        value: { type: 'text' },
      },
    },
  },
  _meta: {
    migrationMappingPropertyHashes: {
      config: '4a11183eee21e6fbad864f7a30b39ad0',
    },
  },
};

export const migrationBaseFixture = (): MigrationBaseState => ({
  retryCount: 0,
  skipRetryReset: false,
  retryDelay: 0,
  retryAttempts: 15,
  logs: [],
  indexPrefix: '.kibana',
  kibanaVersion: '7.11.0',
  outdatedDocumentsQuery: {},
  targetIndexMappings: indexMapping,
  batchSize: 1000,
  maxBatchSize: 1000,
  maxBatchSizeBytes: 1e8,
  maxReadBatchSizeBytes: 1234,
  discardUnknownObjects: false,
  discardCorruptObjects: false,
  currentAlias: '.kibana',
  versionAlias: '.kibana_7.11.0',
  versionIndex: '.kibana_7.11.0_001',
  excludeOnUpgradeQuery: { bool: { must_not: [] } },
  indexTypes: ['config'],
  knownTypes: ['config'],
  latestMappingsVersions: { config: '10.3.0' },
  hashToVersionMap: {},
  excludeFromUpgradeFilterHooks: {},
  migrationDocLinks: {
    resolveMigrationFailures: 'https://example.com/resolve',
    repeatedTimeoutRequests: 'https://example.com/timeout',
    routingAllocationDisabled: 'https://example.com/routing',
    clusterShardLimitExceeded: 'https://example.com/shards',
  },
  waitForMigrationCompletion: false,
  esCapabilities: elasticsearchServiceMock.createCapabilities(),
});

export const postInitFixture = (): PostInitState => ({
  ...migrationBaseFixture(),
  aliases: {},
  sourceIndex: Option.none,
  sourceIndexMappings: Option.none,
  targetIndex: '.kibana_7.11.0_001',
  versionIndexReadyActions: Option.none,
});

export const sourceExistsFixture = (): SourceExistsState => ({
  ...postInitFixture(),
  sourceIndex: Option.some('.kibana_7.10.0_001') as Option.Some<string>,
  sourceIndexMappings: Option.some(indexMapping) as Option.Some<IndexMapping>,
});

export const sampleRawDoc: SavedObjectsRawDoc = {
  _id: 'config:1',
  _source: {
    type: 'config',
    config: { value: 'x' },
    migrationVersion: {},
    references: [],
  },
};

export const bulkOperationBatchesFixture = (): BulkOperation[][] => [
  [[{ index: { _id: sampleRawDoc._id } }, sampleRawDoc._source]],
];

export const makeState = <TName extends StateName>(
  name: TName,
  overrides: Partial<StateOf<TName>> = {}
): StateOf<TName> => {
  const base = postInitFixture();

  switch (name) {
    case INIT.Name:
      return { ...migrationBaseFixture(), name: INIT.Name, ...overrides } as StateOf<TName>;
    case FATAL.Name:
      return {
        ...migrationBaseFixture(),
        name: FATAL.Name,
        reason: 'test failure',
        ...overrides,
      } as StateOf<TName>;
    case DONE.Name:
      return { ...base, name: DONE.Name, ...overrides } as StateOf<TName>;
    default:
      return { ...base, name, ...overrides } as StateOf<TName>;
  }
};

/** `makeState` with compatible-migration `sourceIndex` / mappings populated. */
export const makeSourceExistsState = <TName extends StateName>(
  name: TName,
  overrides: Partial<StateOf<TName>> = {}
): StateOf<TName> => ({ ...sourceExistsFixture(), name, ...overrides } as StateOf<TName>);
