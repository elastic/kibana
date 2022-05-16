/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import * as Option from 'fp-ts/Option';
import { DocLinksServiceSetup } from '../../doc_links';
import { docLinksServiceMock, loggingSystemMock } from '../../mocks';
import { SavedObjectsMigrationConfigType } from '../saved_objects_config';
import { SavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { createInitialState } from './initial_state';

const mockLogger = loggingSystemMock.create();

describe('createInitialState', () => {
  let typeRegistry: SavedObjectTypeRegistry;
  let docLinks: DocLinksServiceSetup;

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
    docLinks = docLinksServiceMock.createSetupContract();
  });

  const migrationsConfig = {
    retryAttempts: 15,
    batchSize: 1000,
    maxBatchSizeBytes: ByteSizeValue.parse('100mb'),
  } as unknown as SavedObjectsMigrationConfigType;
  it('creates the initial state for the model based on the passed in parameters', () => {
    expect(
      createInitialState({
        kibanaVersion: '8.1.0',
        targetMappings: {
          dynamic: 'strict',
          properties: { my_type: { properties: { title: { type: 'text' } } } },
        },
        migrationVersionPerType: {},
        indexPrefix: '.kibana_task_manager',
        migrationsConfig,
        typeRegistry,
        docLinks,
        logger: mockLogger.get(),
      })
    ).toEqual({
      batchSize: 1000,
      maxBatchSizeBytes: ByteSizeValue.parse('100mb').getValueInBytes(),
      controlState: 'INIT',
      currentAlias: '.kibana_task_manager',
      excludeFromUpgradeFilterHooks: {},
      ignoreUnknownObjects: false,
      indexPrefix: '.kibana_task_manager',
      kibanaVersion: '8.1.0',
      knownTypes: [],
      legacyIndex: '.kibana_task_manager',
      logs: [],
      outdatedDocumentsQuery: {
        bool: {
          should: [],
        },
      },
      preMigrationScript: {
        _tag: 'None',
      },
      retryAttempts: 15,
      retryCount: 0,
      retryDelay: 0,
      targetIndexMappings: {
        dynamic: 'strict',
        properties: {
          my_type: {
            properties: {
              title: {
                type: 'text',
              },
            },
          },
        },
      },
      tempIndex: '.kibana_task_manager_8.1.0_reindex_temp',
      tempIndexMappings: {
        dynamic: false,
        properties: {
          migrationVersion: {
            dynamic: 'true',
            type: 'object',
          },
          type: {
            type: 'keyword',
          },
        },
      },
      unusedTypesQuery: {
        bool: {
          must_not: expect.arrayContaining([
            {
              bool: {
                must: [
                  {
                    match: {
                      type: 'search-session',
                    },
                  },
                  {
                    match: {
                      'search-session.persisted': false,
                    },
                  },
                ],
              },
            },
          ]),
        },
      },
      versionAlias: '.kibana_task_manager_8.1.0',
      versionIndex: '.kibana_task_manager_8.1.0_001',
      migrationDocLinks: {
        resolveMigrationFailures:
          'https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html',
        repeatedTimeoutRequests:
          'https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html#_repeated_time_out_requests_that_eventually_fail',
        routingAllocationDisabled:
          'https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html#routing-allocation-disabled',
      },
    });
  });

  it('returns state with the correct `knownTypes`', () => {
    typeRegistry.registerType({
      name: 'foo',
      namespaceType: 'single',
      hidden: false,
      mappings: { properties: {} },
    });
    typeRegistry.registerType({
      name: 'bar',
      namespaceType: 'multiple',
      hidden: true,
      mappings: { properties: {} },
    });

    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig,
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(initialState.knownTypes).toEqual(['foo', 'bar']);
  });

  it('returns state with the correct `excludeFromUpgradeFilterHooks`', () => {
    const fooExcludeOnUpgradeHook = jest.fn();
    typeRegistry.registerType({
      name: 'foo',
      namespaceType: 'single',
      hidden: false,
      mappings: { properties: {} },
      excludeOnUpgrade: fooExcludeOnUpgradeHook,
    });

    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig,
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(initialState.excludeFromUpgradeFilterHooks).toEqual({ foo: fooExcludeOnUpgradeHook });
  });

  it('returns state with a preMigration script', () => {
    const preMigrationScript = "ctx._id = ctx._source.type + ':' + ctx._id";
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      preMigrationScript,
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig,
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(Option.isSome(initialState.preMigrationScript)).toEqual(true);
    expect((initialState.preMigrationScript as Option.Some<string>).value).toEqual(
      preMigrationScript
    );
  });
  it('returns state without a preMigration script', () => {
    expect(
      Option.isNone(
        createInitialState({
          kibanaVersion: '8.1.0',
          targetMappings: {
            dynamic: 'strict',
            properties: { my_type: { properties: { title: { type: 'text' } } } },
          },
          preMigrationScript: undefined,
          migrationVersionPerType: {},
          indexPrefix: '.kibana_task_manager',
          migrationsConfig,
          typeRegistry,
          docLinks,
          logger: mockLogger.get(),
        }).preMigrationScript
      )
    ).toEqual(true);
  });
  it('returns state with an outdatedDocumentsQuery', () => {
    expect(
      createInitialState({
        kibanaVersion: '8.1.0',
        targetMappings: {
          dynamic: 'strict',
          properties: { my_type: { properties: { title: { type: 'text' } } } },
        },
        preMigrationScript: "ctx._id = ctx._source.type + ':' + ctx._id",
        migrationVersionPerType: { my_dashboard: '7.10.1', my_viz: '8.0.0' },
        indexPrefix: '.kibana_task_manager',
        migrationsConfig,
        typeRegistry,
        docLinks,
        logger: mockLogger.get(),
      }).outdatedDocumentsQuery
    ).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "should": Array [
              Object {
                "bool": Object {
                  "must": Object {
                    "term": Object {
                      "type": "my_dashboard",
                    },
                  },
                  "must_not": Object {
                    "term": Object {
                      "migrationVersion.my_dashboard": "7.10.1",
                    },
                  },
                },
              },
              Object {
                "bool": Object {
                  "must": Object {
                    "term": Object {
                      "type": "my_viz",
                    },
                  },
                  "must_not": Object {
                    "term": Object {
                      "migrationVersion.my_viz": "8.0.0",
                    },
                  },
                },
              },
            ],
          },
        }
      `);
  });

  it('initializes the `ignoreUnknownObjects` flag to false if the value provided in the config does not match the current kibana version', () => {
    const logger = mockLogger.get();
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        ignoreUnknownObjects: '8.0.0',
      },
      typeRegistry,
      docLinks,
      logger,
    });

    expect(initialState.ignoreUnknownObjects).toEqual(false);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith(
      'The flag `migrations.ignoreUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be ignored.'
    );
  });

  it('initializes the `ignoreUnknownObjects` flag to true if the value provided in the config matches the current kibana version', () => {
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        ignoreUnknownObjects: '8.1.0',
      },
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(initialState.ignoreUnknownObjects).toEqual(true);
  });
});
