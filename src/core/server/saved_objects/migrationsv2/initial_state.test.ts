/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Option from 'fp-ts/Option';
import { SavedObjectsMigrationConfigType } from '../saved_objects_config';
import { SavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { createInitialState } from './initial_state';

describe('createInitialState', () => {
  let typeRegistry: SavedObjectTypeRegistry;

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
  });

  const migrationsConfig = ({
    retryAttempts: 15,
    batchSize: 1000,
  } as unknown) as SavedObjectsMigrationConfigType;
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
      })
    ).toMatchInlineSnapshot(`
      Object {
        "batchSize": 1000,
        "controlState": "INIT",
        "currentAlias": ".kibana_task_manager",
        "indexPrefix": ".kibana_task_manager",
        "kibanaVersion": "8.1.0",
        "knownTypes": Array [],
        "legacyIndex": ".kibana_task_manager",
        "logs": Array [],
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
        "unusedTypesQuery": Object {
          "bool": Object {
            "must_not": Array [
              Object {
                "term": Object {
                  "type": "fleet-agent-events",
                },
              },
              Object {
                "term": Object {
                  "type": "tsvb-validation-telemetry",
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
        "versionAlias": ".kibana_task_manager_8.1.0",
        "versionIndex": ".kibana_task_manager_8.1.0_001",
      }
    `);
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
    });

    expect(initialState.knownTypes).toEqual(['foo', 'bar']);
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
});
