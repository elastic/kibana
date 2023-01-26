/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import * as Option from 'fp-ts/Option';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import {
  type SavedObjectsMigrationConfigType,
  SavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createInitialState } from './initial_state';

const mockLogger = loggingSystemMock.create();

describe('createInitialState', () => {
  let typeRegistry: SavedObjectTypeRegistry;
  let docLinks: DocLinksServiceSetup;

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
    docLinks = docLinksServiceMock.createSetupContract();
  });

  afterEach(() => jest.clearAllMocks());

  const migrationsConfig = {
    retryAttempts: 15,
    batchSize: 1000,
    maxBatchSizeBytes: ByteSizeValue.parse('100mb'),
  } as unknown as SavedObjectsMigrationConfigType;

  it('creates the initial state for the model based on the passed in parameters', () => {
    expect(
      createInitialState({
        kibanaVersion: '8.1.0',
        waitForMigrationCompletion: true,
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
    ).toMatchInlineSnapshot(`
      Object {
        "batchSize": 1000,
        "controlState": "INIT",
        "currentAlias": ".kibana_task_manager",
        "discardCorruptObjects": false,
        "discardUnknownObjects": false,
        "excludeFromUpgradeFilterHooks": Object {},
        "excludeOnUpgradeQuery": Object {
          "bool": Object {
            "must_not": Array [
              Object {
                "term": Object {
                  "type": "apm-services-telemetry",
                },
              },
              Object {
                "term": Object {
                  "type": "application_usage_transactional",
                },
              },
              Object {
                "term": Object {
                  "type": "background-session",
                },
              },
              Object {
                "term": Object {
                  "type": "cases-sub-case",
                },
              },
              Object {
                "term": Object {
                  "type": "csp_rule",
                },
              },
              Object {
                "term": Object {
                  "type": "file-upload-telemetry",
                },
              },
              Object {
                "term": Object {
                  "type": "fleet-agent-actions",
                },
              },
              Object {
                "term": Object {
                  "type": "fleet-agent-events",
                },
              },
              Object {
                "term": Object {
                  "type": "fleet-agents",
                },
              },
              Object {
                "term": Object {
                  "type": "fleet-enrollment-api-keys",
                },
              },
              Object {
                "term": Object {
                  "type": "guided-setup-state",
                },
              },
              Object {
                "term": Object {
                  "type": "ml-telemetry",
                },
              },
              Object {
                "term": Object {
                  "type": "osquery-usage-metric",
                },
              },
              Object {
                "term": Object {
                  "type": "server",
                },
              },
              Object {
                "term": Object {
                  "type": "siem-detection-engine-rule-status",
                },
              },
              Object {
                "term": Object {
                  "type": "timelion-sheet",
                },
              },
              Object {
                "term": Object {
                  "type": "tsvb-validation-telemetry",
                },
              },
              Object {
                "term": Object {
                  "type": "ui-counter",
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "match": Object {
                        "type": "search-session",
                      },
                    },
                    Object {
                      "match": Object {
                        "search-session.persisted": false,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        "indexPrefix": ".kibana_task_manager",
        "kibanaVersion": "8.1.0",
        "knownTypes": Array [],
        "legacyIndex": ".kibana_task_manager",
        "logs": Array [],
        "maxBatchSizeBytes": 104857600,
        "migrationDocLinks": Object {
          "clusterShardLimitExceeded": "https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html#cluster-shard-limit-exceeded",
          "repeatedTimeoutRequests": "https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html#_repeated_time_out_requests_that_eventually_fail",
          "resolveMigrationFailures": "https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html",
          "routingAllocationDisabled": "https://www.elastic.co/guide/en/kibana/test-branch/resolve-migrations-failures.html#routing-allocation-disabled",
        },
        "outdatedDocumentsQuery": Object {
          "bool": Object {
            "should": Array [],
          },
        },
        "preMigrationScript": Object {
          "_tag": "None",
        },
        "retryAttempts": 15,
        "retryCount": 0,
        "retryDelay": 0,
        "targetIndexMappings": Object {
          "dynamic": "strict",
          "properties": Object {
            "my_type": Object {
              "properties": Object {
                "title": Object {
                  "type": "text",
                },
              },
            },
          },
        },
        "tempIndex": ".kibana_task_manager_8.1.0_reindex_temp",
        "tempIndexMappings": Object {
          "dynamic": false,
          "properties": Object {
            "migrationVersion": Object {
              "dynamic": "true",
              "type": "object",
            },
            "type": Object {
              "type": "keyword",
            },
          },
        },
        "versionAlias": ".kibana_task_manager_8.1.0",
        "versionIndex": ".kibana_task_manager_8.1.0_001",
        "waitForMigrationCompletion": true,
      }
    `);
  });

  it('creates the initial state for the model with waitForMigrationCompletion false,', () => {
    expect(
      createInitialState({
        kibanaVersion: '8.1.0',
        waitForMigrationCompletion: false,
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
    ).toMatchObject({
      waitForMigrationCompletion: false,
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
      waitForMigrationCompletion: false,
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
      waitForMigrationCompletion: false,
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
      waitForMigrationCompletion: false,
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
          waitForMigrationCompletion: false,
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
        waitForMigrationCompletion: false,
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

  it('initializes the `discardUnknownObjects` flag to false if the flag is not provided in the config', () => {
    const logger = mockLogger.get();
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      waitForMigrationCompletion: false,
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig,
      typeRegistry,
      docLinks,
      logger,
    });

    expect(logger.warn).not.toBeCalled();
    expect(initialState.discardUnknownObjects).toEqual(false);
  });

  it('initializes the `discardUnknownObjects` flag to false if the value provided in the config does not match the current kibana version', () => {
    const logger = mockLogger.get();
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      waitForMigrationCompletion: false,
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        discardUnknownObjects: '8.0.0',
      },
      typeRegistry,
      docLinks,
      logger,
    });

    expect(initialState.discardUnknownObjects).toEqual(false);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith(
      'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be discarded.'
    );
  });

  it('initializes the `discardUnknownObjects` flag to true if the value provided in the config matches the current kibana version', () => {
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      waitForMigrationCompletion: false,
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        discardUnknownObjects: '8.1.0',
      },
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(initialState.discardUnknownObjects).toEqual(true);
  });

  it('initializes the `discardCorruptObjects` flag to false if the value provided in the config does not match the current kibana version', () => {
    const logger = mockLogger.get();
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      waitForMigrationCompletion: false,
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        discardCorruptObjects: '8.0.0',
      },
      typeRegistry,
      docLinks,
      logger,
    });

    expect(initialState.discardCorruptObjects).toEqual(false);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith(
      'The flag `migrations.discardCorruptObjects` is defined but does not match the current kibana version; corrupt objects will NOT be discarded.'
    );
  });

  it('initializes the `discardCorruptObjects` flag to true if the value provided in the config matches the current kibana version', () => {
    const initialState = createInitialState({
      kibanaVersion: '8.1.0',
      waitForMigrationCompletion: false,
      targetMappings: {
        dynamic: 'strict',
        properties: { my_type: { properties: { title: { type: 'text' } } } },
      },
      migrationVersionPerType: {},
      indexPrefix: '.kibana_task_manager',
      migrationsConfig: {
        ...migrationsConfig,
        discardCorruptObjects: '8.1.0',
      },
      typeRegistry,
      docLinks,
      logger: mockLogger.get(),
    });

    expect(initialState.discardCorruptObjects).toEqual(true);
  });
});
