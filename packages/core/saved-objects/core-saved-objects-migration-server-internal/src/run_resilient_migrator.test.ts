/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import buffer from 'buffer';
import { ByteSizeValue } from '@kbn/config-schema';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import { createInitialState } from './initial_state';
import { waitGroup } from './kibana_migrator_utils';
import { migrationStateActionMachine } from './migrations_state_action_machine';
import { next } from './next';
import { runResilientMigrator, type RunResilientMigratorParams } from './run_resilient_migrator';
import {
  hashToVersionMapMock,
  indexTypesMapMock,
  savedObjectTypeRegistryMock,
} from './run_resilient_migrator.fixtures';
import type { InitState, State } from './state';
import type { Next } from './state_action_machine';

const SOME_MIGRATION_RESULT: MigrationResult = {
  sourceIndex: '.my_index_pre8.2.3_001',
  destIndex: '.my_index_8.2.3_001',
  elapsedMs: 16,
  status: 'migrated',
};

jest.mock('./migrations_state_action_machine', () => {
  const actual = jest.requireActual('./migrations_state_action_machine');
  return {
    ...actual,
    migrationStateActionMachine: jest.fn(() => Promise.resolve(SOME_MIGRATION_RESULT)),
  };
});

jest.mock('./initial_state', () => {
  const actual = jest.requireActual('./initial_state');
  return {
    ...actual,
    createInitialState: jest.fn(actual.createInitialState),
  };
});

jest.mock('./next', () => {
  const actual = jest.requireActual('./next');
  return {
    ...actual,
    next: jest.fn(actual.next),
  };
});

describe('runResilientMigrator', () => {
  let options: RunResilientMigratorParams;
  let initialState: InitState;
  let migrationResult: MigrationResult;
  let nextFunc: Next<State>;

  beforeAll(async () => {
    options = mockOptions();
    migrationResult = await runResilientMigrator(options);
  });

  it('calls createInitialState with the right params', () => {
    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(createInitialState).toHaveBeenCalledWith({
      kibanaVersion: options.kibanaVersion,
      waitForMigrationCompletion: options.waitForMigrationCompletion,
      mustRelocateDocuments: options.mustRelocateDocuments,
      indexTypes: options.indexTypes,
      indexTypesMap: options.indexTypesMap,
      hashToVersionMap: options.hashToVersionMap,
      targetIndexMappings: options.targetIndexMappings,
      preMigrationScript: options.preMigrationScript,
      migrationVersionPerType: options.migrationVersionPerType,
      coreMigrationVersionPerType: options.coreMigrationVersionPerType,
      indexPrefix: options.indexPrefix,
      migrationsConfig: options.migrationsConfig,
      typeRegistry: options.typeRegistry,
      docLinks: options.docLinks,
      logger: options.logger,
      esCapabilities: options.esCapabilities,
    });

    // store the created initial state
    initialState = (createInitialState as jest.MockedFunction<typeof createInitialState>).mock
      .results[0].value;

    // store the generated "next" function
    nextFunc = (next as jest.MockedFunction<typeof next>).mock.results[0].value;
  });

  it('calls migrationStateMachine with the right params', () => {
    expect(migrationStateActionMachine).toHaveBeenCalledTimes(1);
    expect(migrationStateActionMachine).toHaveBeenCalledWith({
      initialState,
      logger: options.logger,
      next: nextFunc,
      model: expect.any(Function),
      abort: expect.any(Function),
    });
  });

  it('returns the result of migrationStateMachine', () => {
    expect(migrationResult).toEqual(SOME_MIGRATION_RESULT);
  });
});

const mockOptions = (): RunResilientMigratorParams => {
  const logger = loggingSystemMock.create().get();
  const mockedClient = elasticsearchClientMock.createElasticsearchClient();
  (mockedClient as any).child = jest.fn().mockImplementation(() => mockedClient);

  return {
    client: mockedClient,
    kibanaVersion: '8.8.0',
    waitForMigrationCompletion: false,
    mustRelocateDocuments: true,
    indexTypes: ['a', 'c'],
    indexTypesMap: indexTypesMapMock,
    hashToVersionMap: hashToVersionMapMock,
    targetIndexMappings: {
      properties: {
        a: { type: 'keyword' },
        c: { type: 'long' },
      },
      _meta: {
        migrationMappingPropertyHashes: {
          a: '000',
          c: '222',
        },
      },
    },
    readyToReindex: waitGroup(),
    doneReindexing: waitGroup(),
    updateRelocationAliases: waitGroup(),
    logger,
    transformRawDocs: jest.fn(),
    preMigrationScript: "ctx._id = ctx._source.type + ':' + ctx._id",
    migrationVersionPerType: { my_dashboard: '7.10.1', my_viz: '8.0.0' },
    coreMigrationVersionPerType: {},
    indexPrefix: '.my_index',
    migrationsConfig: {
      algorithm: 'v2' as const,
      batchSize: 20,
      maxBatchSizeBytes: ByteSizeValue.parse('20mb'),
      maxReadBatchSizeBytes: new ByteSizeValue(buffer.constants.MAX_STRING_LENGTH),
      pollInterval: 20000,
      scrollDuration: '10m',
      skip: false,
      retryAttempts: 20,
      zdt: {
        metaPickupSyncDelaySec: 120,
        runOnRoles: ['migrator'],
      },
    },
    typeRegistry: savedObjectTypeRegistryMock,
    docLinks: docLinksServiceMock.createSetupContract(),
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
  };
};
