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
  type IndexMapping,
} from '@kbn/core-saved-objects-base-server-internal';
import type { Logger } from '@kbn/logging';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createInitialState, type CreateInitialStateParams } from './initial_state';
import * as getOutdatedDocumentsQueryModule from './get_outdated_documents_query';
import { getOutdatedDocumentsQuery } from './get_outdated_documents_query';

const mockLogger = loggingSystemMock.create();

const migrationsConfig = {
  retryAttempts: 15,
  batchSize: 1000,
  maxBatchSizeBytes: ByteSizeValue.parse('100mb'),
} as unknown as SavedObjectsMigrationConfigType;

const createInitialStateCommonParams = {
  kibanaVersion: '8.1.0',
  waitForMigrationCompletion: false,
  mustRelocateDocuments: true,
  indexTypesMap: {
    '.kibana': ['typeA', 'typeB', 'typeC'],
    '.kibana_task_manager': ['task'],
    '.kibana_cases': ['typeD', 'typeE'],
  },
  targetMappings: {
    dynamic: 'strict',
    properties: { my_type: { properties: { title: { type: 'text' } } } },
  } as IndexMapping,
  coreMigrationVersionPerType: {},
  migrationVersionPerType: {},
  indexPrefix: '.kibana_task_manager',
  migrationsConfig,
};

describe('createInitialState', () => {
  let typeRegistry: SavedObjectTypeRegistry;
  let docLinks: DocLinksServiceSetup;
  let logger: Logger;
  let createInitialStateParams: CreateInitialStateParams;

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
    docLinks = docLinksServiceMock.createSetupContract();
    logger = mockLogger.get();
    createInitialStateParams = {
      ...createInitialStateCommonParams,
      typeRegistry,
      docLinks,
      logger,
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('creates the initial state for the model based on the passed in parameters', () => {
    expect(
      createInitialState({
        ...createInitialStateParams,
        waitForMigrationCompletion: true,
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
                  "type": "endpoint:user-artifact",
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
                  "type": "maps-telemetry",
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
                  "type": "siem-detection-engine-rule-execution-info",
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
                "term": Object {
                  "type": "upgrade-assistant-telemetry",
                },
              },
            ],
          },
        },
        "indexPrefix": ".kibana_task_manager",
        "indexTypesMap": Object {
          ".kibana": Array [
            "typeA",
            "typeB",
            "typeC",
          ],
          ".kibana_cases": Array [
            "typeD",
            "typeE",
          ],
          ".kibana_task_manager": Array [
            "task",
          ],
        },
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
        "mustRelocateDocuments": true,
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
          "_meta": Object {
            "indexTypesMap": Object {
              ".kibana": Array [
                "typeA",
                "typeB",
                "typeC",
              ],
              ".kibana_cases": Array [
                "typeD",
                "typeE",
              ],
              ".kibana_task_manager": Array [
                "task",
              ],
            },
          },
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
            "type": Object {
              "type": "keyword",
            },
            "typeMigrationVersion": Object {
              "type": "version",
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
    expect(createInitialState(createInitialStateParams)).toMatchObject({
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
      ...createInitialStateParams,
      typeRegistry,
      docLinks,
      logger,
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

    const initialState = createInitialState(createInitialStateParams);
    expect(initialState.excludeFromUpgradeFilterHooks).toEqual({ foo: fooExcludeOnUpgradeHook });
  });

  it('returns state with a preMigration script', () => {
    const preMigrationScript = "ctx._id = ctx._source.type + ':' + ctx._id";
    const initialState = createInitialState({
      ...createInitialStateParams,
      preMigrationScript,
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
          ...createInitialStateParams,
          preMigrationScript: undefined,
        }).preMigrationScript
      )
    ).toEqual(true);
  });
  it('returns state with an outdatedDocumentsQuery', () => {
    jest.spyOn(getOutdatedDocumentsQueryModule, 'getOutdatedDocumentsQuery');

    expect(
      createInitialState({
        ...createInitialStateParams,
        preMigrationScript: "ctx._id = ctx._source.type + ':' + ctx._id",
        coreMigrationVersionPerType: {},
        migrationVersionPerType: { my_dashboard: '7.10.1', my_viz: '8.0.0' },
      }).outdatedDocumentsQuery
    ).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "should": Array [
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "type": "my_dashboard",
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "typeMigrationVersion",
                                },
                              },
                              Object {
                                "exists": Object {
                                  "field": "migrationVersion.my_dashboard",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "must": Object {
                              "exists": Object {
                                "field": "migrationVersion",
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
                          "range": Object {
                            "typeMigrationVersion": Object {
                              "lt": "7.10.1",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "must": Array [
                  Object {
                    "term": Object {
                      "type": "my_viz",
                    },
                  },
                  Object {
                    "bool": Object {
                      "should": Array [
                        Object {
                          "bool": Object {
                            "must_not": Array [
                              Object {
                                "exists": Object {
                                  "field": "typeMigrationVersion",
                                },
                              },
                              Object {
                                "exists": Object {
                                  "field": "migrationVersion.my_viz",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "must": Object {
                              "exists": Object {
                                "field": "migrationVersion",
                              },
                            },
                            "must_not": Object {
                              "term": Object {
                                "migrationVersion.my_viz": "8.0.0",
                              },
                            },
                          },
                        },
                        Object {
                          "range": Object {
                            "typeMigrationVersion": Object {
                              "lt": "8.0.0",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
    expect(getOutdatedDocumentsQuery).toHaveBeenCalledWith({
      coreMigrationVersionPerType: {},
      migrationVersionPerType: { my_dashboard: '7.10.1', my_viz: '8.0.0' },
    });
  });

  it('initializes the `discardUnknownObjects` flag to false if the flag is not provided in the config', () => {
    const initialState = createInitialState(createInitialStateParams);

    expect(logger.warn).not.toBeCalled();
    expect(initialState.discardUnknownObjects).toEqual(false);
  });

  it('initializes the `discardUnknownObjects` flag to false if the value provided in the config does not match the current kibana version', () => {
    const initialState = createInitialState({
      ...createInitialStateParams,
      migrationsConfig: {
        ...migrationsConfig,
        discardUnknownObjects: '8.0.0',
      },
    });

    expect(initialState.discardUnknownObjects).toEqual(false);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith(
      'The flag `migrations.discardUnknownObjects` is defined but does not match the current kibana version; unknown objects will NOT be discarded.'
    );
  });

  it('initializes the `discardUnknownObjects` flag to true if the value provided in the config matches the current kibana version', () => {
    const initialState = createInitialState({
      ...createInitialStateParams,
      migrationsConfig: {
        ...migrationsConfig,
        discardUnknownObjects: '8.1.0',
      },
    });

    expect(initialState.discardUnknownObjects).toEqual(true);
  });

  it('initializes the `discardCorruptObjects` flag to false if the value provided in the config does not match the current kibana version', () => {
    const initialState = createInitialState({
      ...createInitialStateParams,
      migrationsConfig: {
        ...migrationsConfig,
        discardCorruptObjects: '8.0.0',
      },
    });

    expect(initialState.discardCorruptObjects).toEqual(false);
    expect(logger.warn).toBeCalledTimes(1);
    expect(logger.warn).toBeCalledWith(
      'The flag `migrations.discardCorruptObjects` is defined but does not match the current kibana version; corrupt objects will NOT be discarded.'
    );
  });

  it('initializes the `discardCorruptObjects` flag to true if the value provided in the config matches the current kibana version', () => {
    const initialState = createInitialState({
      ...createInitialStateParams,
      migrationsConfig: {
        ...migrationsConfig,
        discardCorruptObjects: '8.1.0',
      },
    });

    expect(initialState.discardCorruptObjects).toEqual(true);
  });
});
