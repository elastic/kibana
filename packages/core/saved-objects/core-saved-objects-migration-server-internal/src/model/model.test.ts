/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type {
  FatalState,
  State,
  LegacySetWriteBlockState,
  SetSourceWriteBlockState,
  LegacyCreateReindexTargetState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacyDeleteState,
  ReindexSourceToTempOpenPit,
  ReindexSourceToTempRead,
  ReindexSourceToTempClosePit,
  ReindexSourceToTempTransform,
  RefreshTarget,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsSearchClosePit,
  OutdatedDocumentsTransform,
  MarkVersionIndexReady,
  BaseState,
  CreateReindexTempState,
  MarkVersionIndexReadyConflict,
  CreateNewTargetState,
  CloneTempToSource,
  SetTempWriteBlock,
  WaitForYellowSourceState,
  TransformedDocumentsBulkIndex,
  ReindexSourceToTempIndexBulk,
  CheckUnknownDocumentsState,
  CalculateExcludeFiltersState,
  PostInitState,
  CheckVersionIndexReadyActions,
  UpdateTargetMappingsMeta,
  CheckTargetMappingsState,
} from '../state';
import { type TransformErrorObjects, TransformSavedObjectDocumentError } from '../core';
import type { AliasAction, RetryableEsClientError } from '../actions';
import type { ResponseType } from '../next';
import { createInitialProgress } from './progress';
import { model } from './model';

describe('migrations v2 model', () => {
  const baseState: BaseState = {
    controlState: '',
    legacyIndex: '.kibana',
    kibanaVersion: '7.11.0',
    logs: [],
    retryCount: 0,
    retryDelay: 0,
    retryAttempts: 15,
    batchSize: 1000,
    maxBatchSizeBytes: 1e8,
    discardUnknownObjects: false,
    discardCorruptObjects: false,
    indexPrefix: '.kibana',
    outdatedDocumentsQuery: {},
    targetIndexMappings: {
      properties: {
        new_saved_object_type: {
          properties: {
            value: { type: 'text' },
          },
        },
      },
      _meta: {
        migrationMappingPropertyHashes: {
          new_saved_object_type: '4a11183eee21e6fbad864f7a30b39ad0',
        },
      },
    },
    tempIndexMappings: { properties: {} },
    preMigrationScript: Option.none,
    currentAlias: '.kibana',
    versionAlias: '.kibana_7.11.0',
    versionIndex: '.kibana_7.11.0_001',
    tempIndex: '.kibana_7.11.0_reindex_temp',
    excludeOnUpgradeQuery: {
      bool: {
        must_not: [
          {
            term: {
              type: 'unused-fleet-agent-events',
            },
          },
        ],
      },
    },
    knownTypes: ['dashboard', 'config'],
    excludeFromUpgradeFilterHooks: {},
    migrationDocLinks: {
      resolveMigrationFailures: 'https://someurl.co/',
      repeatedTimeoutRequests: 'repeatedTimeoutRequests',
      routingAllocationDisabled: 'routingAllocationDisabled',
      clusterShardLimitExceeded: 'clusterShardLimitExceeded',
    },
    waitForMigrationCompletion: false,
  };

  describe('exponential retry delays for retryable_es_client_error', () => {
    let state: State = {
      ...baseState,
      controlState: 'INIT',
    };
    const retryableError: RetryableEsClientError = {
      type: 'retryable_es_client_error',
      message: 'snapshot_in_progress_exception',
    };
    test('increments retryCount, exponential retryDelay if an action fails with a retryable_es_client_error', () => {
      const states = new Array(10).fill(1).map(() => {
        state = model(state, Either.left(retryableError));
        return state;
      });
      const retryState = states.map(({ retryCount, retryDelay }) => ({ retryCount, retryDelay }));
      expect(retryState).toMatchInlineSnapshot(`
          Array [
            Object {
              "retryCount": 1,
              "retryDelay": 2000,
            },
            Object {
              "retryCount": 2,
              "retryDelay": 4000,
            },
            Object {
              "retryCount": 3,
              "retryDelay": 8000,
            },
            Object {
              "retryCount": 4,
              "retryDelay": 16000,
            },
            Object {
              "retryCount": 5,
              "retryDelay": 32000,
            },
            Object {
              "retryCount": 6,
              "retryDelay": 64000,
            },
            Object {
              "retryCount": 7,
              "retryDelay": 64000,
            },
            Object {
              "retryCount": 8,
              "retryDelay": 64000,
            },
            Object {
              "retryCount": 9,
              "retryDelay": 64000,
            },
            Object {
              "retryCount": 10,
              "retryDelay": 64000,
            },
          ]
        `);
    });

    test('resets retryCount, retryDelay when an action succeeds', () => {
      const res: ResponseType<'INIT'> = Either.right({
        '.kibana_7.11.0_001': {
          aliases: {
            '.kibana': {},
            '.kibana_7.11.0': {},
          },
          mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
          settings: {},
        },
      });
      const newState = model({ ...state, ...{ retryCount: 5, retryDelay: 32000 } }, res);

      expect(newState.retryCount).toEqual(0);
      expect(newState.retryDelay).toEqual(0);
    });

    test('terminates to FATAL after retryAttempts retries', () => {
      const newState = model(
        { ...state, ...{ retryCount: 15, retryDelay: 64000 } },
        Either.left(retryableError)
      ) as FatalState;

      expect(newState.controlState).toEqual('FATAL');
      expect(newState.reason).toMatchInlineSnapshot(
        `"Unable to complete the INIT step after 15 attempts, terminating. The last failure message was: snapshot_in_progress_exception"`
      );
    });
  });

  describe('model transitions from', () => {
    it('transition returns new state', () => {
      const initState: State = {
        ...baseState,
        controlState: 'INIT',
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.11.0',
        versionIndex: '.kibana_7.11.0_001',
      };

      const res: ResponseType<'INIT'> = Either.right({
        '.kibana_7.11.0_001': {
          aliases: {
            '.kibana': {},
            '.kibana_7.11.0': {},
          },
          mappings: {
            properties: {},
          },
          settings: {},
        },
      });
      const newState = model(initState, res);
      expect(newState).not.toBe(initState);
    });

    describe('INIT', () => {
      const initBaseState: State = {
        ...baseState,
        controlState: 'INIT',
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.11.0',
        versionIndex: '.kibana_7.11.0_001',
      };

      const mappingsWithUnknownType = {
        properties: {
          disabled_saved_object_type: {
            properties: {
              value: { type: 'keyword' },
            },
          },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            disabled_saved_object_type: '7997cf5a56cc02bdc9c93361bde732b0',
          },
        },
      } as const;

      describe('if waitForMigrationCompletion=true', () => {
        const initState = Object.assign({}, initBaseState, {
          waitForMigrationCompletion: true,
        });
        test('INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if .kibana is already pointing to the target index', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.11.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
          // This snapshot asserts that we merge the
          // migrationMappingPropertyHashes of the existing index, but we leave
          // the mappings for the disabled_saved_object_type untouched. There
          // might be another Kibana instance that knows about this type and
          // needs these mappings in place.
          expect(newState.targetIndexMappings).toMatchInlineSnapshot(`
            Object {
              "_meta": Object {
                "migrationMappingPropertyHashes": Object {
                  "disabled_saved_object_type": "7997cf5a56cc02bdc9c93361bde732b0",
                  "new_saved_object_type": "4a11183eee21e6fbad864f7a30b39ad0",
                },
              },
              "properties": Object {
                "new_saved_object_type": Object {
                  "properties": Object {
                    "value": Object {
                      "type": "text",
                    },
                  },
                },
              },
            }
          `);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> INIT when cluster routing allocation is incompatible', () => {
          const res: ResponseType<'INIT'> = Either.left({
            type: 'incompatible_cluster_routing_allocation',
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('INIT');
          expect(newState.retryCount).toEqual(1);
          expect(newState.retryDelay).toEqual(2000);
          expect(newState.logs[0]).toMatchInlineSnapshot(`
            Object {
              "level": "error",
              "message": "Action failed with '[incompatible_cluster_routing_allocation] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to routingAllocationDisabled for more information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
            }
          `);
        });
        test("INIT -> FATAL when .kibana points to newer version's index", () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.12.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"The .kibana alias is pointing to a newer version of Kibana: v7.12.0"`
          );
        });
        test('INIT -> FATAL when .kibana points to multiple indices', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.12.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"The .kibana alias is pointing to multiple indices: .kibana_7.12.0_001,.kibana_7.11.0_001."`
          );
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when .kibana points to an index with an invalid version', () => {
          // If users tamper with our index version naming scheme we can no
          // longer accurately detect a newer version. Older Kibana versions
          // will have indices like `.kibana_10` and users might choose an
          // invalid name when restoring from a snapshot. So we try to be
          // lenient and assume it's an older index and perform a migration.
          // If the tampered index belonged to a newer version the migration
          // will fail when we start transforming documents.
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.invalid.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toBe(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_3': {
              aliases: {},
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(
            {
              ...initState,
              ...{
                kibanaVersion: '7.12.0',
                versionAlias: '.kibana_7.12.0',
                versionIndex: '.kibana_7.12.0_001',
              },
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a v1 migrations index (>= 6.5 < 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_3': {
              aliases: {
                '.kibana': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a legacy index (>= 6.0.0 < 6.5)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana': {
              aliases: {},
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a custom kibana.index name (>= 6.5 < 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            'my-saved-objects_3': {
              aliases: {
                'my-saved-objects': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(
            {
              ...initState,
              controlState: 'INIT',
              currentAlias: 'my-saved-objects',
              versionAlias: 'my-saved-objects_7.11.0',
              versionIndex: 'my-saved-objects_7.11.0_001',
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a custom kibana.index v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            'my-saved-objects_7.11.0': {
              aliases: {
                'my-saved-objects': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(
            {
              ...initState,
              controlState: 'INIT',
              kibanaVersion: '7.12.0',
              currentAlias: 'my-saved-objects',
              versionAlias: 'my-saved-objects_7.12.0',
              versionIndex: 'my-saved-objects_7.12.0_001',
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when no indices/aliases exist', () => {
          const res: ResponseType<'INIT'> = Either.right({});
          const newState = model(initState, res);

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toEqual(2000);
        });
      });
      describe('if waitForMigrationCompletion=false', () => {
        const initState = Object.assign({}, initBaseState, {
          waitForMigrationCompletion: false,
        });
        test('INIT -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if .kibana is already pointing to the target index', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.11.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
          // This snapshot asserts that we merge the
          // migrationMappingPropertyHashes of the existing index, but we leave
          // the mappings for the disabled_saved_object_type untouched. There
          // might be another Kibana instance that knows about this type and
          // needs these mappings in place.
          expect(newState.targetIndexMappings).toMatchInlineSnapshot(`
            Object {
              "_meta": Object {
                "migrationMappingPropertyHashes": Object {
                  "disabled_saved_object_type": "7997cf5a56cc02bdc9c93361bde732b0",
                  "new_saved_object_type": "4a11183eee21e6fbad864f7a30b39ad0",
                },
              },
              "properties": Object {
                "new_saved_object_type": Object {
                  "properties": Object {
                    "value": Object {
                      "type": "text",
                    },
                  },
                },
              },
            }
          `);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> INIT when cluster routing allocation is incompatible', () => {
          const res: ResponseType<'INIT'> = Either.left({
            type: 'incompatible_cluster_routing_allocation',
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('INIT');
          expect(newState.retryCount).toEqual(1);
          expect(newState.retryDelay).toEqual(2000);
          expect(newState.logs[0]).toMatchInlineSnapshot(`
            Object {
              "level": "error",
              "message": "Action failed with '[incompatible_cluster_routing_allocation] Incompatible Elasticsearch cluster settings detected. Remove the persistent and transient Elasticsearch cluster setting 'cluster.routing.allocation.enable' or set it to a value of 'all' to allow migrations to proceed. Refer to routingAllocationDisabled for more information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
            }
          `);
        });
        test("INIT -> FATAL when .kibana points to newer version's index", () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.12.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"The .kibana alias is pointing to a newer version of Kibana: v7.12.0"`
          );
        });
        test('INIT -> FATAL when .kibana points to multiple indices', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.12.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"The .kibana alias is pointing to multiple indices: .kibana_7.12.0_001,.kibana_7.11.0_001."`
          );
        });
        test('INIT -> WAIT_FOR_YELLOW_SOURCE when .kibana points to an index with an invalid version', () => {
          // If users tamper with our index version naming scheme we can no
          // longer accurately detect a newer version. Older Kibana versions
          // will have indices like `.kibana_10` and users might choose an
          // invalid name when restoring from a snapshot. So we try to be
          // lenient and assume it's an older index and perform a migration.
          // If the tampered index belonged to a newer version the migration
          // will fail when we start transforming documents.
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.invalid.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.12.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('.kibana_7.invalid.0_001');
        });

        test('INIT -> WAIT_FOR_YELLOW_SOURCE when migrating from a v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_3': {
              aliases: {},
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(
            {
              ...initState,
              ...{
                kibanaVersion: '7.12.0',
                versionAlias: '.kibana_7.12.0',
                versionIndex: '.kibana_7.12.0_001',
              },
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('.kibana_7.11.0_001');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });

        test('INIT -> WAIT_FOR_YELLOW_SOURCE when migrating from a v1 migrations index (>= 6.5 < 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_3': {
              aliases: {
                '.kibana': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('.kibana_3');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> LEGACY_SET_WRITE_BLOCK when migrating from a legacy index (>= 6.0.0 < 6.5)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana': {
              aliases: {},
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState).toMatchObject({
            controlState: 'LEGACY_SET_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_pre6.5.0_001'),
            targetIndex: '.kibana_7.11.0_001',
          });
          // This snapshot asserts that we disable the unknown saved object
          // type. Because it's mappings are disabled, we also don't copy the
          // `_meta.migrationMappingPropertyHashes` for the disabled type.
          expect(newState.targetIndexMappings).toMatchInlineSnapshot(`
            Object {
              "_meta": Object {
                "migrationMappingPropertyHashes": Object {
                  "new_saved_object_type": "4a11183eee21e6fbad864f7a30b39ad0",
                },
              },
              "properties": Object {
                "new_saved_object_type": Object {
                  "properties": Object {
                    "value": Object {
                      "type": "text",
                    },
                  },
                },
              },
            }
          `);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> WAIT_FOR_YELLOW_SOURCE when migrating from a custom kibana.index name (>= 6.5 < 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            'my-saved-objects_3': {
              aliases: {
                'my-saved-objects': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(
            {
              ...baseState,
              controlState: 'INIT',
              currentAlias: 'my-saved-objects',
              versionAlias: 'my-saved-objects_7.11.0',
              versionIndex: 'my-saved-objects_7.11.0_001',
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('my-saved-objects_3');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> WAIT_FOR_YELLOW_SOURCE when migrating from a custom kibana.index v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            'my-saved-objects_7.11.0': {
              aliases: {
                'my-saved-objects': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
          });
          const newState = model(
            {
              ...baseState,
              controlState: 'INIT',
              kibanaVersion: '7.12.0',
              currentAlias: 'my-saved-objects',
              versionAlias: 'my-saved-objects_7.12.0',
              versionIndex: 'my-saved-objects_7.12.0_001',
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('my-saved-objects_7.11.0');

          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> CREATE_NEW_TARGET when no indices/aliases exist', () => {
          const res: ResponseType<'INIT'> = Either.right({});
          const newState = model(initState, res);

          expect(newState).toMatchObject({
            controlState: 'CREATE_NEW_TARGET',
            sourceIndex: Option.none,
            targetIndex: '.kibana_7.11.0_001',
          });
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
      });
    });

    describe('WAIT_FOR_MIGRATION_COMPLETION', () => {
      const waitForMState: State = {
        ...baseState,
        controlState: 'WAIT_FOR_MIGRATION_COMPLETION',
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.11.0',
        versionIndex: '.kibana_7.11.0_001',
      };

      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when .kibana points to an index with an invalid version', () => {
        // If users tamper with our index version naming scheme we can no
        // longer accurately detect a newer version. Older Kibana versions
        // will have indices like `.kibana_10` and users might choose an
        // invalid name when restoring from a snapshot. So we try to be
        // lenient and assume it's an older index and perform a migration.
        // If the tampered index belonged to a newer version the migration
        // will fail when we start transforming documents.
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          '.kibana_7.invalid.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.12.0': {},
            },
            mappings: { properties: {} },
            settings: {},
          },
          '.kibana_7.11.0_001': {
            aliases: { '.kibana_7.11.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(waitForMState, res) as WaitForYellowSourceState;

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toBe(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a v2 migrations index (>= 7.11.0)', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
            mappings: { properties: {} },
            settings: {},
          },
          '.kibana_3': {
            aliases: {},
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(
          {
            ...waitForMState,
            ...{
              kibanaVersion: '7.12.0',
              versionAlias: '.kibana_7.12.0',
              versionIndex: '.kibana_7.12.0_001',
            },
          },
          res
        ) as WaitForYellowSourceState;

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a v1 migrations index (>= 6.5 < 7.11.0)', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          '.kibana_3': {
            aliases: {
              '.kibana': {},
            },
            mappings: { properties: {} },
            settings: {},
          },
        });
        const newState = model(waitForMState, res) as WaitForYellowSourceState;

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a legacy index (>= 6.0.0 < 6.5)', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          '.kibana': {
            aliases: {},
            mappings: { properties: {} },
            settings: {},
          },
        });
        const newState = model(waitForMState, res);

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a custom kibana.index name (>= 6.5 < 7.11.0)', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          'my-saved-objects_3': {
            aliases: {
              'my-saved-objects': {},
            },
            mappings: { properties: {} },
            settings: {},
          },
        });
        const newState = model(
          {
            ...waitForMState,
            currentAlias: 'my-saved-objects',
            versionAlias: 'my-saved-objects_7.11.0',
            versionIndex: 'my-saved-objects_7.11.0_001',
          },
          res
        ) as WaitForYellowSourceState;

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a custom kibana.index v2 migrations index (>= 7.11.0)', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          'my-saved-objects_7.11.0': {
            aliases: {
              'my-saved-objects': {},
            },
            mappings: { properties: {} },
            settings: {},
          },
        });
        const newState = model(
          {
            ...waitForMState,
            kibanaVersion: '7.12.0',
            currentAlias: 'my-saved-objects',
            versionAlias: 'my-saved-objects_7.12.0',
            versionIndex: 'my-saved-objects_7.12.0_001',
          },
          res
        ) as WaitForYellowSourceState;

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });
      test('WAIT_FOR_MIGRATION_COMPLETION -> WAIT_FOR_MIGRATION_COMPLETION when no indices/aliases exist', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({});
        const newState = model(waitForMState, res);

        expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
        expect(newState.retryDelay).toEqual(2000);
      });

      it('WAIT_FOR_MIGRATION_COMPLETION -> DONE when another instance finished the migration', () => {
        const res: ResponseType<'WAIT_FOR_MIGRATION_COMPLETION'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.11.0': {},
            },
            mappings: { properties: {} },
            settings: {},
          },
        });
        const newState = model(waitForMState, res);

        expect(newState.controlState).toEqual('DONE');
      });
    });

    describe('LEGACY_SET_WRITE_BLOCK', () => {
      const legacySetWriteBlockState: LegacySetWriteBlockState = {
        ...baseState,
        controlState: 'LEGACY_SET_WRITE_BLOCK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        legacyReindexTargetMappings: { properties: {} },
        legacyPreMigrationDoneActions: [],
        legacyIndex: '',
      };
      test('LEGACY_SET_WRITE_BLOCK -> LEGACY_SET_WRITE_BLOCK if action fails with set_write_block_failed', () => {
        const res: ResponseType<'LEGACY_SET_WRITE_BLOCK'> = Either.left({
          type: 'retryable_es_client_error',
          message: 'set_write_block_failed',
        });
        const newState = model(legacySetWriteBlockState, res);
        expect(newState.controlState).toEqual('LEGACY_SET_WRITE_BLOCK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });
      test('LEGACY_SET_WRITE_BLOCK -> LEGACY_CREATE_REINDEX_TARGET if action fails with index_not_found_exception', () => {
        const res: ResponseType<'LEGACY_SET_WRITE_BLOCK'> = Either.left({
          type: 'index_not_found_exception',
          index: 'legacy_index_name',
        });
        const newState = model(legacySetWriteBlockState, res);
        expect(newState.controlState).toEqual('LEGACY_CREATE_REINDEX_TARGET');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_SET_WRITE_BLOCK -> LEGACY_CREATE_REINDEX_TARGET if action succeeds with set_write_block_succeeded', () => {
        const res: ResponseType<'LEGACY_SET_WRITE_BLOCK'> = Either.right(
          'set_write_block_succeeded'
        );
        const newState = model(legacySetWriteBlockState, res);
        expect(newState.controlState).toEqual('LEGACY_CREATE_REINDEX_TARGET');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('LEGACY_CREATE_REINDEX_TARGET', () => {
      const legacyCreateReindexTargetState: LegacyCreateReindexTargetState = {
        ...baseState,
        controlState: 'LEGACY_CREATE_REINDEX_TARGET',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        legacyReindexTargetMappings: { properties: {} },
        legacyPreMigrationDoneActions: [],
        legacyIndex: '',
      };
      test('LEGACY_CREATE_REINDEX_TARGET -> LEGACY_REINDEX', () => {
        const res: ResponseType<'LEGACY_CREATE_REINDEX_TARGET'> =
          Either.right('create_index_succeeded');
        const newState = model(legacyCreateReindexTargetState, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_CREATE_REINDEX_TARGET -> LEGACY_CREATE_REINDEX_TARGET if action fails with index_not_green_timeout', () => {
        const res: ResponseType<'LEGACY_CREATE_REINDEX_TARGET'> = Either.left({
          message: '[index_not_green_timeout] Timeout waiting for ...',
          type: 'index_not_green_timeout',
        });
        const newState = model(legacyCreateReindexTargetState, res);
        expect(newState.controlState).toEqual('LEGACY_CREATE_REINDEX_TARGET');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
        expect(newState.logs[0]).toMatchInlineSnapshot(`
          Object {
            "level": "error",
            "message": "Action failed with '[index_not_green_timeout] Timeout waiting for ... Refer to repeatedTimeoutRequests for information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
          }
        `);
      });
      test('LEGACY_CREATE_REINDEX_TARGET -> LEGACY_REINDEX resets retry count and retry delay if action succeeds', () => {
        const res: ResponseType<'LEGACY_CREATE_REINDEX_TARGET'> =
          Either.right('create_index_succeeded');
        const testState = {
          ...legacyCreateReindexTargetState,
          retryCount: 1,
          retryDelay: 2000,
        };
        const newState = model(testState, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_CREATE_REINDEX_TARGET -> FATAL if action fails with cluster_shard_limit_exceeded', () => {
        const res: ResponseType<'LEGACY_CREATE_REINDEX_TARGET'> = Either.left({
          type: 'cluster_shard_limit_exceeded',
        });
        const newState = model(legacyCreateReindexTargetState, res);
        expect(newState.controlState).toEqual('FATAL');
        expect((newState as FatalState).reason).toMatchInlineSnapshot(
          `"[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources. See clusterShardLimitExceeded"`
        );
      });
    });

    describe('LEGACY_REINDEX', () => {
      const legacyReindexState: LegacyReindexState = {
        ...baseState,
        controlState: 'LEGACY_REINDEX',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        legacyReindexTargetMappings: { properties: {} },
        legacyPreMigrationDoneActions: [],
        legacyIndex: '',
      };
      test('LEGACY_REINDEX -> LEGACY_REINDEX_WAIT_FOR_TASK', () => {
        const res: ResponseType<'LEGACY_REINDEX'> = Either.right({ taskId: 'task id' });
        const newState = model(legacyReindexState, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('LEGACY_REINDEX_WAIT_FOR_TASK', () => {
      const legacyReindexWaitForTaskState: LegacyReindexWaitForTaskState = {
        ...baseState,
        controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('source_index_name') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        legacyReindexTargetMappings: { properties: {} },
        legacyPreMigrationDoneActions: [],
        legacyIndex: 'legacy_index_name',
        legacyReindexTaskId: 'test_task_id',
      };
      test('LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_DELETE if action succeeds', () => {
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.right('reindex_succeeded');
        const newState = model(legacyReindexWaitForTaskState, res);
        expect(newState.controlState).toEqual('LEGACY_DELETE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_DELETE if action fails with index_not_found_exception for reindex source', () => {
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
          type: 'index_not_found_exception',
          index: 'legacy_index_name',
        });
        const newState = model(legacyReindexWaitForTaskState, res);
        expect(newState.controlState).toEqual('LEGACY_DELETE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_DELETE if action fails with target_index_had_write_block', () => {
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
          type: 'target_index_had_write_block',
        });
        const newState = model(legacyReindexWaitForTaskState, res);
        expect(newState.controlState).toEqual('LEGACY_DELETE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_REINDEX_WAIT_FOR_TASK if action fails with wait_for_task_completion_timeout', () => {
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(legacyReindexWaitForTaskState, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });
      test('LEGACY_REINDEX_WAIT_FOR_TASK -> LEGACY_REINDEX_WAIT_FOR_TASK with incremented retryCount if action fails with wait_for_task_completion_timeout a second time', () => {
        const state = Object.assign({}, legacyReindexWaitForTaskState, { retryCount: 1 });
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(2);
        expect(newState.retryDelay).toEqual(4000);
      });
    });

    describe('LEGACY_DELETE', () => {
      const legacyDeleteState: LegacyDeleteState = {
        ...baseState,
        controlState: 'LEGACY_DELETE',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('source_index_name') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        legacyReindexTargetMappings: { properties: {} },
        legacyPreMigrationDoneActions: [],
        legacyIndex: 'legacy_index_name',
      };
      test('LEGACY_DELETE -> SET_SOURCE_WRITE_BLOCK if action succeeds', () => {
        const res: ResponseType<'LEGACY_DELETE'> = Either.right('update_aliases_succeeded');
        const newState = model(legacyDeleteState, res);
        expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_DELETE -> SET_SOURCE_WRITE_BLOCK if action fails with index_not_found_exception for legacy index', () => {
        const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
          type: 'index_not_found_exception',
          index: 'legacy_index_name',
        });
        const newState = model(legacyDeleteState, res);
        expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('LEGACY_DELETE -> SET_SOURCE_WRITE_BLOCK if action fails with remove_index_not_a_concrete_index', () => {
        const res: ResponseType<'LEGACY_DELETE'> = Either.left({
          type: 'remove_index_not_a_concrete_index',
        });
        const newState = model(legacyDeleteState, res);
        expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('WAIT_FOR_YELLOW_SOURCE', () => {
      const someMappings = {
        properties: {},
      } as const;

      const waitForYellowSourceState: WaitForYellowSourceState = {
        ...baseState,
        controlState: 'WAIT_FOR_YELLOW_SOURCE',
        sourceIndex: Option.some('.kibana_3') as Option.Some<string>,
        sourceIndexMappings: someMappings,
      };

      test('WAIT_FOR_YELLOW_SOURCE -> CHECK_UNKNOWN_DOCUMENTS if action succeeds', () => {
        const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.right({});
        const newState = model(waitForYellowSourceState, res);
        expect(newState.controlState).toEqual('CHECK_UNKNOWN_DOCUMENTS');

        expect(newState).toMatchObject({
          controlState: 'CHECK_UNKNOWN_DOCUMENTS',
          sourceIndex: Option.some('.kibana_3'),
        });
      });

      test('WAIT_FOR_YELLOW_SOURCE -> WAIT_FOR_YELLOW_SOURCE if action fails with index_not_yellow_timeout', () => {
        const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.left({
          message: '[index_not_yellow_timeout] Timeout waiting for ...',
          type: 'index_not_yellow_timeout',
        });
        const newState = model(waitForYellowSourceState, res);
        expect(newState.controlState).toEqual('WAIT_FOR_YELLOW_SOURCE');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
        expect(newState.logs[0]).toMatchInlineSnapshot(`
          Object {
            "level": "error",
            "message": "Action failed with '[index_not_yellow_timeout] Timeout waiting for ... Refer to repeatedTimeoutRequests for information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
          }
        `);
      });

      test('WAIT_FOR_YELLOW_SOURCE -> CHECK_UNKNOWN_DOCUMENTS resets retry count and delay if action succeeds', () => {
        const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.right({});
        const testState = {
          ...waitForYellowSourceState,
          retryCount: 1,
          retryDelay: 2000,
        };
        const newState = model(testState, res);
        expect(newState.controlState).toEqual('CHECK_UNKNOWN_DOCUMENTS');

        expect(newState).toMatchObject({
          controlState: 'CHECK_UNKNOWN_DOCUMENTS',
          sourceIndex: Option.some('.kibana_3'),
        });
      });
    });

    describe('CHECK_UNKNOWN_DOCUMENTS', () => {
      const mappingsWithUnknownType = {
        properties: {
          disabled_saved_object_type: {
            properties: {
              value: { type: 'keyword' },
            },
          },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            disabled_saved_object_type: '7997cf5a56cc02bdc9c93361bde732b0',
          },
        },
      } as const;

      test('CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK if action succeeds and no unknown docs are found', () => {
        const checkUnknownDocumentsSourceState: CheckUnknownDocumentsState = {
          ...baseState,
          controlState: 'CHECK_UNKNOWN_DOCUMENTS',
          sourceIndex: Option.some('.kibana_3') as Option.Some<string>,
          sourceIndexMappings: mappingsWithUnknownType,
        };

        const res: ResponseType<'CHECK_UNKNOWN_DOCUMENTS'> = Either.right({});
        const newState = model(checkUnknownDocumentsSourceState, res);
        expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');

        expect(newState).toMatchObject({
          controlState: 'SET_SOURCE_WRITE_BLOCK',
          sourceIndex: Option.some('.kibana_3'),
          targetIndex: '.kibana_7.11.0_001',
        });

        // This snapshot asserts that we disable the unknown saved object
        // type. Because it's mappings are disabled, we also don't copy the
        // `_meta.migrationMappingPropertyHashes` for the disabled type.
        expect(newState.targetIndexMappings).toMatchInlineSnapshot(`
          Object {
            "_meta": Object {
              "migrationMappingPropertyHashes": Object {
                "new_saved_object_type": "4a11183eee21e6fbad864f7a30b39ad0",
              },
            },
            "properties": Object {
              "new_saved_object_type": Object {
                "properties": Object {
                  "value": Object {
                    "type": "text",
                  },
                },
              },
            },
          }
        `);

        // No log message gets appended
        expect(newState.logs).toEqual([]);
      });

      describe('when unknown docs are found', () => {
        test('CHECK_UNKNOWN_DOCUMENTS -> SET_SOURCE_WRITE_BLOCK if discardUnknownObjects=true', () => {
          const checkUnknownDocumentsSourceState: CheckUnknownDocumentsState = {
            ...baseState,
            discardUnknownObjects: true,
            controlState: 'CHECK_UNKNOWN_DOCUMENTS',
            sourceIndex: Option.some('.kibana_3') as Option.Some<string>,
            sourceIndexMappings: mappingsWithUnknownType,
          };

          const res: ResponseType<'CHECK_UNKNOWN_DOCUMENTS'> = Either.right({
            type: 'unknown_docs_found',
            unknownDocs: [
              { id: 'dashboard:12', type: 'dashboard' },
              { id: 'foo:17', type: 'foo' },
            ],
          });
          const newState = model(checkUnknownDocumentsSourceState, res);

          expect(newState).toMatchObject({
            controlState: 'SET_SOURCE_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_3'),
            targetIndex: '.kibana_7.11.0_001',
          });

          expect(newState.excludeOnUpgradeQuery).toEqual({
            bool: {
              must_not: [
                { term: { type: 'unused-fleet-agent-events' } },
                { term: { type: 'dashboard' } },
                { term: { type: 'foo' } },
              ],
              must: [{ exists: { field: 'type' } }],
            },
          });

          // we should have a warning in the logs about the ignored types
          expect(
            newState.logs.find(({ level, message }) => {
              return (
                level === 'warning' && message.includes('dashboard') && message.includes('foo')
              );
            })
          ).toBeDefined();
        });

        test('CHECK_UNKNOWN_DOCUMENTS -> FATAL if discardUnknownObjects=false', () => {
          const checkUnknownDocumentsSourceState: CheckUnknownDocumentsState = {
            ...baseState,
            controlState: 'CHECK_UNKNOWN_DOCUMENTS',
            sourceIndex: Option.some('.kibana_3') as Option.Some<string>,
            sourceIndexMappings: mappingsWithUnknownType,
          };

          const res: ResponseType<'CHECK_UNKNOWN_DOCUMENTS'> = Either.right({
            type: 'unknown_docs_found',
            unknownDocs: [
              { id: 'dashboard:12', type: 'dashboard' },
              { id: 'foo:17', type: 'foo' },
            ],
          });
          const newState = model(checkUnknownDocumentsSourceState, res);
          expect(newState.controlState).toEqual('FATAL');

          expect(newState).toMatchObject({
            controlState: 'FATAL',
            reason: expect.stringContaining(
              'Migration failed because some documents were found which use unknown saved object types'
            ),
          });
        });
      });
    });

    describe('SET_SOURCE_WRITE_BLOCK', () => {
      const setWriteBlockState: SetSourceWriteBlockState = {
        ...baseState,
        controlState: 'SET_SOURCE_WRITE_BLOCK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('SET_SOURCE_WRITE_BLOCK -> SET_SOURCE_WRITE_BLOCK if action fails with set_write_block_failed', () => {
        const res: ResponseType<'SET_SOURCE_WRITE_BLOCK'> = Either.left({
          type: 'retryable_es_client_error',
          message: 'set_write_block_failed',
        });
        const newState = model(setWriteBlockState, res);
        expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });
      test('SET_SOURCE_WRITE_BLOCK -> CALCULATE_EXCLUDE_FILTERS if action succeeds with set_write_block_succeeded', () => {
        const res: ResponseType<'SET_SOURCE_WRITE_BLOCK'> = Either.right(
          'set_write_block_succeeded'
        );
        const newState = model(setWriteBlockState, res);
        expect(newState.controlState).toEqual('CALCULATE_EXCLUDE_FILTERS');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('CALCULATE_EXCLUDE_FILTERS', () => {
      const state: CalculateExcludeFiltersState = {
        ...baseState,
        controlState: 'CALCULATE_EXCLUDE_FILTERS',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        tempIndexMappings: { properties: {} },
      };
      test('CALCULATE_EXCLUDE_FILTERS -> CALCULATE_EXCLUDE_FILTERS if action fails with retryable error', () => {
        const res: ResponseType<'CALCULATE_EXCLUDE_FILTERS'> = Either.left({
          type: 'retryable_es_client_error',
          message: 'Something temporarily broke!',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('CALCULATE_EXCLUDE_FILTERS');
      });
      it('CALCULATE_EXCLUDE_FILTERS -> CREATE_REINDEX_TEMP if action succeeds with filters', () => {
        const res: ResponseType<'CALCULATE_EXCLUDE_FILTERS'> = Either.right({
          mustNotClauses: [{ term: { fieldA: 'abc' } }],
          errorsByType: { type1: new Error('an error!') },
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('CREATE_REINDEX_TEMP');

        expect(newState.excludeOnUpgradeQuery).toEqual({
          // new filters should be added inside a must_not clause, enriching excludeOnUpgradeQuery
          bool: {
            must_not: [
              {
                term: {
                  type: 'unused-fleet-agent-events',
                },
              },
              {
                term: {
                  fieldA: 'abc',
                },
              },
            ],
          },
        });
        // Logs should be added for any errors encountered from excludeOnUpgrade hooks
        expect(newState.logs).toEqual([
          {
            level: 'warning',
            message: `Ignoring excludeOnUpgrade hook on type [type1] that failed with error: "Error: an error!"`,
          },
        ]);
      });
    });

    describe('CREATE_REINDEX_TEMP', () => {
      const state: CreateReindexTempState = {
        ...baseState,
        controlState: 'CREATE_REINDEX_TEMP',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        tempIndexMappings: { properties: {} },
      };
      it('CREATE_REINDEX_TEMP -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT if action succeeds', () => {
        const res: ResponseType<'CREATE_REINDEX_TEMP'> = Either.right('create_index_succeeded');
        const newState = model(state, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_OPEN_PIT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      it('CREATE_REINDEX_TEMP -> CREATE_REINDEX_TEMP if action fails with index_not_green_timeout', () => {
        const res: ResponseType<'CREATE_REINDEX_TEMP'> = Either.left({
          message: '[index_not_green_timeout] Timeout waiting for ...',
          type: 'index_not_green_timeout',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('CREATE_REINDEX_TEMP');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
        expect(newState.logs[0]).toMatchInlineSnapshot(`
          Object {
            "level": "error",
            "message": "Action failed with '[index_not_green_timeout] Timeout waiting for ... Refer to repeatedTimeoutRequests for information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
          }
        `);
      });
      it('CREATE_REINDEX_TEMP -> REINDEX_SOURCE_TO_TEMP_OPEN_PIT resets retry count if action succeeds', () => {
        const res: ResponseType<'CREATE_REINDEX_TEMP'> = Either.right('create_index_succeeded');
        const testState = {
          ...state,
          retryCount: 1,
          retryDelay: 2000,
        };
        const newState = model(testState, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_OPEN_PIT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('CREATE_REINDEX_TEMP -> FATAL if action fails with cluster_shard_limit_exceeded', () => {
        const res: ResponseType<'CREATE_REINDEX_TEMP'> = Either.left({
          type: 'cluster_shard_limit_exceeded',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('FATAL');
        expect((newState as FatalState).reason).toMatchInlineSnapshot(
          `"[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources. See clusterShardLimitExceeded"`
        );
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_OPEN_PIT', () => {
      const state: ReindexSourceToTempOpenPit = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_OPEN_PIT',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        tempIndexMappings: { properties: {} },
      };
      it('REINDEX_SOURCE_TO_TEMP_OPEN_PIT -> REINDEX_SOURCE_TO_TEMP_READ if action succeeds', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_OPEN_PIT'> = Either.right({
          pitId: 'pit_id',
        });
        const newState = model(state, res) as ReindexSourceToTempRead;
        expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.sourceIndexPitId).toBe('pit_id');
        expect(newState.lastHitSortValue).toBe(undefined);
        expect(newState.progress.processed).toBe(undefined);
        expect(newState.progress.total).toBe(undefined);
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_READ', () => {
      const state: ReindexSourceToTempRead = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_READ',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexPitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        tempIndexMappings: { properties: {} },
        lastHitSortValue: undefined,
        corruptDocumentIds: [],
        transformErrors: [],
        progress: createInitialProgress(),
      };

      it('REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_TRANSFORM if the index has outdated documents to reindex', () => {
        const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
        const lastHitSortValue = [123456];
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
          outdatedDocuments,
          lastHitSortValue,
          totalHits: 1,
        });
        const newState = model(state, res) as ReindexSourceToTempTransform;
        expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_TRANSFORM');
        expect(newState.outdatedDocuments).toBe(outdatedDocuments);
        expect(newState.lastHitSortValue).toBe(lastHitSortValue);
        expect(newState.progress.processed).toBe(undefined);
        expect(newState.progress.total).toBe(1);
        expect(newState.logs).toMatchInlineSnapshot(`
          Array [
            Object {
              "level": "info",
              "message": "Starting to process 1 documents.",
            },
          ]
        `);
      });

      it('REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT if no outdated documents to reindex', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
          outdatedDocuments: [],
          lastHitSortValue: undefined,
          totalHits: undefined,
        });
        const newState = model(state, res) as ReindexSourceToTempClosePit;
        expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT');
        expect(newState.sourceIndexPitId).toBe('pit_id');
        expect(newState.logs).toStrictEqual([]); // No logs because no hits
      });

      describe('when transform failures or corrupt documents are found', () => {
        it('REINDEX_SOURCE_TO_TEMP_READ -> FATAL if no outdated documents to reindex and transform failures seen with previous outdated documents', () => {
          const testState: ReindexSourceToTempRead = {
            ...state,
            corruptDocumentIds: ['a:b'],
            transformErrors: [],
          };
          const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
            outdatedDocuments: [],
            lastHitSortValue: undefined,
            totalHits: undefined,
          });
          const newState = model(testState, res) as FatalState;
          expect(newState.controlState).toBe('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(`
            "Migrations failed. Reason: 1 corrupt saved object documents were found: a:b

            To allow migrations to proceed, please delete or fix these documents.
            Note that you can configure Kibana to automatically discard corrupt documents and transform errors for this migration.
            Please refer to https://someurl.co/ for more information."
          `);
          expect(newState.logs).toStrictEqual([]); // No logs because no hits
        });

        it('REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT if discardCorruptObjects=true', () => {
          const testState: ReindexSourceToTempRead = {
            ...state,
            discardCorruptObjects: true,
            corruptDocumentIds: ['a:b'],
            transformErrors: [{ rawId: 'c:d', err: new Error('Oops!') }],
          };
          const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
            outdatedDocuments: [],
            lastHitSortValue: undefined,
            totalHits: undefined,
          });
          const newState = model(testState, res) as ReindexSourceToTempClosePit;
          expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT');
          expect(newState.logs.length).toEqual(1);
          expect(newState.logs[0]).toMatchInlineSnapshot(`
            Object {
              "level": "warning",
              "message": "Kibana has been configured to discard corrupt documents and documents that cause transform errors for this migration.
            Therefore, the following documents will not be taken into account and they will not be available after the migration:
            - \\"a:b\\" (corrupt)
            - \\"c:d\\" (Oops!)
            ",
            }
          `);
        });
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT', () => {
      const state: ReindexSourceToTempClosePit = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexPitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        tempIndexMappings: { properties: {} },
      };

      it('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT -> SET_TEMP_WRITE_BLOCK if action succeeded', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_CLOSE_PIT'> = Either.right({});
        const newState = model(state, res) as ReindexSourceToTempTransform;
        expect(newState.controlState).toBe('SET_TEMP_WRITE_BLOCK');
        expect(newState.sourceIndex).toEqual(state.sourceIndex);
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_TRANSFORM', () => {
      const state: ReindexSourceToTempTransform = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_TRANSFORM',
        outdatedDocuments: [],
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexPitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        lastHitSortValue: undefined,
        corruptDocumentIds: [],
        transformErrors: [],
        progress: { processed: undefined, total: 1 },
      };
      const processedDocs = [
        {
          _id: 'a:b',
          _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
        },
      ] as SavedObjectsRawDoc[];

      it('REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_INDEX_BULK if action succeeded', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_TRANSFORM'> = Either.right({
          processedDocs,
        });
        const newState = model(state, res) as ReindexSourceToTempIndexBulk;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_INDEX_BULK');
        expect(newState.currentBatch).toEqual(0);
        expect(newState.transformedDocBatches).toEqual([processedDocs]);
        expect(newState.progress.processed).toBe(0); // Result of `(undefined ?? 0) + corruptDocumentsId.length`
      });

      it('increments the progress.processed counter', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_TRANSFORM'> = Either.right({
          processedDocs,
        });

        const testState = {
          ...state,
          outdatedDocuments: [{ _id: '1', _source: { type: 'vis' } }],
          progress: {
            processed: 1,
            total: 1,
          },
        };

        const newState = model(testState, res) as ReindexSourceToTempIndexBulk;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_INDEX_BULK');
        expect(newState.progress.processed).toBe(2);
      });

      it('REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_READ if action succeeded but we have carried through previous failures', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_TRANSFORM'> = Either.right({
          processedDocs,
        });
        const testState = {
          ...state,
          corruptDocumentIds: ['a:b'],
          transformErrors: [],
        };
        const newState = model(testState, res) as ReindexSourceToTempTransform;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.corruptDocumentIds.length).toEqual(1);
        expect(newState.transformErrors.length).toEqual(0);
        expect(newState.progress.processed).toBe(0);
      });

      it('REINDEX_SOURCE_TO_TEMP_TRANSFORM -> REINDEX_SOURCE_TO_TEMP_READ when response is left documents_transform_failed', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_TRANSFORM'> = Either.left({
          type: 'documents_transform_failed',
          corruptDocumentIds: ['a:b'],
          transformErrors: [],
          processedDocs: [],
        });
        const newState = model(state, res) as ReindexSourceToTempRead;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.corruptDocumentIds.length).toEqual(1);
        expect(newState.transformErrors.length).toEqual(0);
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_INDEX_BULK', () => {
      const transformedDocBatches = [
        [
          {
            _id: 'a:b',
            _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
          },
        ],
      ] as [SavedObjectsRawDoc[]];
      const reindexSourceToTempIndexBulkState: ReindexSourceToTempIndexBulk = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX_BULK',
        transformedDocBatches,
        currentBatch: 0,
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexPitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        lastHitSortValue: undefined,
        transformErrors: [],
        corruptDocumentIds: [],
        progress: createInitialProgress(),
      };
      test('REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_READ if action succeeded', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX_BULK'> =
          Either.right('bulk_index_succeeded');
        const newState = model(reindexSourceToTempIndexBulkState, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT if response is left target_index_had_write_block', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX_BULK'> = Either.left({
          type: 'target_index_had_write_block',
        });
        const newState = model(reindexSourceToTempIndexBulkState, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT if response is left index_not_found_exception', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX_BULK'> = Either.left({
          type: 'index_not_found_exception',
          index: 'the_temp_index',
        });
        const newState = model(reindexSourceToTempIndexBulkState, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('REINDEX_SOURCE_TO_TEMP_INDEX_BULK -> FATAL if action returns left request_entity_too_large_exception', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX_BULK'> = Either.left({
          type: 'request_entity_too_large_exception',
        });
        const newState = model(reindexSourceToTempIndexBulkState, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option."`
        );
      });
      test('REINDEX_SOURCE_TO_TEMP_INDEX_BULK should throw a throwBadResponse error if action failed', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX_BULK'> = Either.left({
          type: 'retryable_es_client_error',
          message: 'random documents bulk index error',
        });
        const newState = model(reindexSourceToTempIndexBulkState, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_INDEX_BULK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });
    });

    describe('SET_TEMP_WRITE_BLOCK', () => {
      const state: SetTempWriteBlock = {
        ...baseState,
        controlState: 'SET_TEMP_WRITE_BLOCK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('SET_TEMP_WRITE_BLOCK -> CLONE_TEMP_TO_TARGET when response is right', () => {
        const res: ResponseType<'SET_TEMP_WRITE_BLOCK'> = Either.right('set_write_block_succeeded');
        const newState = model(state, res);
        expect(newState.controlState).toEqual('CLONE_TEMP_TO_TARGET');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('CLONE_TEMP_TO_TARGET', () => {
      const state: CloneTempToSource = {
        ...baseState,
        controlState: 'CLONE_TEMP_TO_TARGET',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      it('CLONE_TEMP_TO_TARGET -> REFRESH_TARGET if response is right', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.right({
          acknowledged: true,
          shardsAcknowledged: true,
        });
        const newState = model(state, res);
        expect(newState.controlState).toBe('REFRESH_TARGET');
        expect(newState.retryCount).toBe(0);
        expect(newState.retryDelay).toBe(0);
      });
      it('CLONE_TEMP_TO_TARGET -> REFRESH_TARGET if response is left index_not_found_exception', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.left({
          type: 'index_not_found_exception',
          index: 'temp_index',
        });
        const newState = model(state, res);
        expect(newState.controlState).toBe('REFRESH_TARGET');
        expect(newState.retryCount).toBe(0);
        expect(newState.retryDelay).toBe(0);
      });
      it('CLONE_TEMP_TO_TARGET -> CLONE_TEMP_TO_TARGET if action fails with index_not_green_timeout', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.left({
          message: '[index_not_green_timeout] Timeout waiting for ...',
          type: 'index_not_green_timeout',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('CLONE_TEMP_TO_TARGET');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
        expect(newState.logs[0]).toMatchInlineSnapshot(`
          Object {
            "level": "error",
            "message": "Action failed with '[index_not_green_timeout] Timeout waiting for ... Refer to repeatedTimeoutRequests for information on how to resolve the issue.'. Retrying attempt 1 in 2 seconds.",
          }
        `);
      });
      it('CLONE_TEMP_TO_TARGET -> MARK_VERSION_INDEX_READY resets the retry count and delay', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.right({
          acknowledged: true,
          shardsAcknowledged: true,
        });
        const testState = {
          ...state,
          retryCount: 1,
          retryDelay: 2000,
        };
        const newState = model(testState, res);
        expect(newState.controlState).toBe('REFRESH_TARGET');
        expect(newState.retryCount).toBe(0);
        expect(newState.retryDelay).toBe(0);
      });
      test('CLONE_TEMP_TO_TARGET -> FATAL if action fails with cluster_shard_limit_exceeded', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.left({
          type: 'cluster_shard_limit_exceeded',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('FATAL');
        expect((newState as FatalState).reason).toMatchInlineSnapshot(
          `"[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources. See clusterShardLimitExceeded"`
        );
      });
    });

    describe('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT', () => {
      const state: OutdatedDocumentsSearchOpenPit = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      it('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ if action succeeds', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'> = Either.right({
          pitId: 'pit_id',
        });
        const newState = model(state, res) as OutdatedDocumentsSearchRead;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_READ');
        expect(newState.pitId).toBe('pit_id');
        expect(newState.lastHitSortValue).toBe(undefined);
        expect(newState.retryCount).toBe(0);
        expect(newState.retryDelay).toBe(0);
      });
    });

    describe('OUTDATED_DOCUMENTS_SEARCH_READ', () => {
      const state: OutdatedDocumentsSearchRead = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        pitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        lastHitSortValue: undefined,
        hasTransformedDocs: false,
        corruptDocumentIds: [],
        transformErrors: [],
        progress: createInitialProgress(),
      };

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_TRANSFORM if found documents to transform', () => {
        const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
        const lastHitSortValue = [123456];
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments,
          lastHitSortValue,
          totalHits: 10,
        });
        const newState = model(state, res) as OutdatedDocumentsTransform;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_TRANSFORM');
        expect(newState.outdatedDocuments).toBe(outdatedDocuments);
        expect(newState.lastHitSortValue).toBe(lastHitSortValue);
        expect(newState.progress.processed).toBe(undefined);
        expect(newState.progress.total).toBe(10);
        expect(newState.logs).toMatchInlineSnapshot(`
          Array [
            Object {
              "level": "info",
              "message": "Starting to process 10 documents.",
            },
          ]
        `);
      });

      it('keeps the previous progress.total if not obtained in the result', () => {
        const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
        const lastHitSortValue = [123456];
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments,
          lastHitSortValue,
          totalHits: undefined,
        });
        const testState = {
          ...state,
          progress: {
            processed: 5,
            total: 10,
          },
        };
        const newState = model(testState, res) as OutdatedDocumentsTransform;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_TRANSFORM');
        expect(newState.outdatedDocuments).toBe(outdatedDocuments);
        expect(newState.lastHitSortValue).toBe(lastHitSortValue);
        expect(newState.progress.processed).toBe(5);
        expect(newState.progress.total).toBe(10);
        expect(newState.logs).toMatchInlineSnapshot(`
          Array [
            Object {
              "level": "info",
              "message": "Processed 5 documents out of 10.",
            },
          ]
        `);
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT if no outdated documents to transform', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments: [],
          lastHitSortValue: undefined,
          totalHits: undefined,
        });
        const newState = model(state, res) as OutdatedDocumentsSearchClosePit;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT');
        expect(newState.pitId).toBe('pit_id');
        expect(newState.logs).toStrictEqual([]); // No logs because no hits
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL if no outdated documents to transform and we have failed document migrations', () => {
        const corruptDocumentIdsCarriedOver = ['a:somethingelse'];
        const originalTransformError = new Error('something went wrong');
        const transFormErr = new TransformSavedObjectDocumentError(
          originalTransformError,
          '7.11.0'
        );
        const transformationErrors = [
          { rawId: 'bob:tail', err: transFormErr },
        ] as TransformErrorObjects[];
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments: [],
          lastHitSortValue: undefined,
          totalHits: undefined,
        });
        const transformErrorsState: OutdatedDocumentsSearchRead = {
          ...state,
          corruptDocumentIds: [...corruptDocumentIdsCarriedOver],
          transformErrors: [...transformationErrors],
        };
        const newState = model(transformErrorsState, res) as FatalState;
        expect(newState.controlState).toBe('FATAL');
        expect(newState.reason.includes('Migrations failed. Reason:')).toBe(true);
        expect(newState.reason.includes('1 corrupt saved object documents were found')).toBe(true);
        expect(newState.reason.includes('1 transformation errors were encountered')).toBe(true);
        expect(newState.reason.includes('bob:tail')).toBe(true);
        expect(newState.logs).toStrictEqual([]); // No logs because no hits
      });
    });

    describe('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT', () => {
      const state: OutdatedDocumentsSearchClosePit = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        pitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        hasTransformedDocs: false,
      };

      it('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> CHECK_TARGET_MAPPINGS if action succeeded', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'> = Either.right({});
        const newState = model(state, res) as CheckTargetMappingsState;
        expect(newState.controlState).toBe('CHECK_TARGET_MAPPINGS');
        // @ts-expect-error pitId shouldn't leak outside
        expect(newState.pitId).toBe(undefined);
      });
    });

    describe('CHECK_TARGET_MAPPINGS', () => {
      const checkTargetMappingsState: CheckTargetMappingsState = {
        ...baseState,
        controlState: 'CHECK_TARGET_MAPPINGS',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      it('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS if mappings do not match', () => {
        const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.right({ match: false });
        const newState = model(checkTargetMappingsState, res) as UpdateTargetMappingsState;
        expect(newState.controlState).toBe('UPDATE_TARGET_MAPPINGS');
      });

      it('CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS if mappings match', () => {
        const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.right({ match: true });
        const newState = model(checkTargetMappingsState, res) as CheckVersionIndexReadyActions;
        expect(newState.controlState).toBe('CHECK_VERSION_INDEX_READY_ACTIONS');
      });
    });

    describe('REFRESH_TARGET', () => {
      const state: RefreshTarget = {
        ...baseState,
        controlState: 'REFRESH_TARGET',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      it('REFRESH_TARGET -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if action succeeded', () => {
        const res: ResponseType<'REFRESH_TARGET'> = Either.right({ refreshed: true });
        const newState = model(state, res) as UpdateTargetMappingsState;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
      });
    });

    describe('OUTDATED_DOCUMENTS_TRANSFORM', () => {
      const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
      const corruptDocumentIds = ['a:somethingelse'];
      const originalTransformError = new Error('Dang diggity!');
      const transFormErr = new TransformSavedObjectDocumentError(originalTransformError, '7.11.0');
      const transformationErrors = [
        { rawId: 'bob:tail', err: transFormErr },
      ] as TransformErrorObjects[];
      const outdatedDocumentsTransformState: OutdatedDocumentsTransform = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        outdatedDocuments,
        corruptDocumentIds: [],
        transformErrors: [],
        pitId: 'pit_id',
        lastHitSortValue: [3, 4],
        hasTransformedDocs: false,
        progress: createInitialProgress(),
      };
      describe('OUTDATED_DOCUMENTS_TRANSFORM if action succeeds', () => {
        const processedDocs = [
          {
            _id: 'a:b',
            _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
          },
        ] as SavedObjectsRawDoc[];
        test('OUTDATED_DOCUMENTS_TRANSFORM -> TRANSFORMED_DOCUMENTS_BULK_INDEX if action succeeds', () => {
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.right({ processedDocs });
          const newState = model(
            outdatedDocumentsTransformState,
            res
          ) as TransformedDocumentsBulkIndex;
          expect(newState.controlState).toEqual('TRANSFORMED_DOCUMENTS_BULK_INDEX');
          expect(newState.transformedDocBatches).toEqual([processedDocs]);
          expect(newState.currentBatch).toEqual(0);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
          expect(newState.progress.processed).toBe(outdatedDocuments.length);
        });
        test('OUTDATED_DOCUMENTS_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_READ if there are are existing documents that failed transformation', () => {
          const outdatedDocumentsTransformStateWithFailedDocuments: OutdatedDocumentsTransform = {
            ...outdatedDocumentsTransformState,
            corruptDocumentIds: [...corruptDocumentIds],
            transformErrors: [],
          };
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.right({ processedDocs });
          const newState = model(
            outdatedDocumentsTransformStateWithFailedDocuments,
            res
          ) as OutdatedDocumentsSearchRead;
          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
          expect(newState.corruptDocumentIds).toEqual(corruptDocumentIds);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
          expect(newState.progress.processed).toBe(outdatedDocuments.length);
        });
        test('OUTDATED_DOCUMENTS_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_READ if there are are existing documents that failed transformation because of transform errors', () => {
          const outdatedDocumentsTransformStateWithFailedDocuments: OutdatedDocumentsTransform = {
            ...outdatedDocumentsTransformState,
            corruptDocumentIds: [],
            transformErrors: [...transformationErrors],
          };
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.right({ processedDocs });
          const newState = model(
            outdatedDocumentsTransformStateWithFailedDocuments,
            res
          ) as OutdatedDocumentsSearchRead;
          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
          expect(newState.corruptDocumentIds.length).toEqual(0);
          expect(newState.transformErrors.length).toEqual(1);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
          expect(newState.progress.processed).toBe(outdatedDocuments.length);
        });
      });
      describe('OUTDATED_DOCUMENTS_TRANSFORM if action fails', () => {
        test('OUTDATED_DOCUMENTS_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_READ adding newly failed documents to state if documents failed the transform', () => {
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.left({
            type: 'documents_transform_failed',
            corruptDocumentIds,
            transformErrors: [],
            processedDocs: [],
          });
          const newState = model(
            outdatedDocumentsTransformState,
            res
          ) as OutdatedDocumentsSearchRead;
          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
          expect(newState.corruptDocumentIds).toEqual(corruptDocumentIds);
          expect(newState.progress.processed).toBe(outdatedDocuments.length);
        });
        test('OUTDATED_DOCUMENTS_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_READ combines newly failed documents with those already on state if documents failed the transform', () => {
          const newFailedTransformDocumentIds = ['b:other', 'c:__'];
          const outdatedDocumentsTransformStateWithFailedDocuments: OutdatedDocumentsTransform = {
            ...outdatedDocumentsTransformState,
            corruptDocumentIds: [...corruptDocumentIds],
            transformErrors: [...transformationErrors],
          };
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.left({
            type: 'documents_transform_failed',
            corruptDocumentIds: newFailedTransformDocumentIds,
            transformErrors: transformationErrors,
            processedDocs: [],
          });
          const newState = model(
            outdatedDocumentsTransformStateWithFailedDocuments,
            res
          ) as OutdatedDocumentsSearchRead;
          expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
          expect(newState.corruptDocumentIds).toEqual([
            ...corruptDocumentIds,
            ...newFailedTransformDocumentIds,
          ]);
          expect(newState.progress.processed).toBe(outdatedDocuments.length);
        });
      });
    });

    describe('TRANSFORMED_DOCUMENTS_BULK_INDEX', () => {
      const transformedDocBatches = [
        [
          // batch 0
          {
            _id: 'a:b',
            _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
          },
          {
            _id: 'a:c',
            _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
          },
        ],
        [
          // batch 1
          {
            _id: 'a:d',
            _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
          },
        ],
      ] as SavedObjectsRawDoc[][];
      const transformedDocumentsBulkIndexState: TransformedDocumentsBulkIndex = {
        ...baseState,
        controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
        transformedDocBatches,
        currentBatch: 0,
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        pitId: 'pit_id',
        lastHitSortValue: [3, 4],
        hasTransformedDocs: false,
        progress: createInitialProgress(),
      };

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX -> TRANSFORMED_DOCUMENTS_BULK_INDEX and increments currentBatch if more batches are left', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> =
          Either.right('bulk_index_succeeded');
        const newState = model(
          transformedDocumentsBulkIndexState,
          res
        ) as TransformedDocumentsBulkIndex;
        expect(newState.controlState).toEqual('TRANSFORMED_DOCUMENTS_BULK_INDEX');
        expect(newState.currentBatch).toEqual(1);
      });

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX -> OUTDATED_DOCUMENTS_SEARCH_READ if all batches were written', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> =
          Either.right('bulk_index_succeeded');
        const newState = model(
          { ...transformedDocumentsBulkIndexState, ...{ currentBatch: 1 } },
          res
        );
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
      });

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX throws if action returns left index_not_found_exception', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> = Either.left({
          type: 'index_not_found_exception',
          index: 'the_target_index',
        });
        expect(() =>
          model(transformedDocumentsBulkIndexState, res)
        ).toThrowErrorMatchingInlineSnapshot(
          `"TRANSFORMED_DOCUMENTS_BULK_INDEX received unexpected action response: {\\"type\\":\\"index_not_found_exception\\",\\"index\\":\\"the_target_index\\"}"`
        );
      });

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX throws if action returns left target_index_had_write_block', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> = Either.left({
          type: 'target_index_had_write_block',
        });
        expect(() =>
          model(transformedDocumentsBulkIndexState, res)
        ).toThrowErrorMatchingInlineSnapshot(
          `"TRANSFORMED_DOCUMENTS_BULK_INDEX received unexpected action response: {\\"type\\":\\"target_index_had_write_block\\"}"`
        );
      });

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX -> FATAL if action returns left request_entity_too_large_exception', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> = Either.left({
          type: 'request_entity_too_large_exception',
        });
        const newState = model(transformedDocumentsBulkIndexState, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"While indexing a batch of saved objects, Elasticsearch returned a 413 Request Entity Too Large exception. Ensure that the Kibana configuration option 'migrations.maxBatchSizeBytes' is set to a value that is lower than or equal to the Elasticsearch 'http.max_content_length' configuration option."`
        );
      });
    });

    describe('UPDATE_TARGET_MAPPINGS', () => {
      const updateTargetMappingsState: UpdateTargetMappingsState = {
        ...baseState,
        controlState: 'UPDATE_TARGET_MAPPINGS',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('UPDATE_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS'> = Either.right({
          taskId: 'update target mappings task',
        });
        const newState = model(
          updateTargetMappingsState,
          res
        ) as UpdateTargetMappingsWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK');
        expect(newState.updateTargetMappingsTaskId).toEqual('update target mappings task');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK', () => {
      const updateTargetMappingsWaitForTaskState: UpdateTargetMappingsWaitForTaskState = {
        ...baseState,
        controlState: 'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        updateTargetMappingsTaskId: 'update target mappings task',
      };

      test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META if response is right', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.right(
          'pickup_updated_mappings_succeeded'
        );

        const newState = model(
          updateTargetMappingsWaitForTaskState,
          res
        ) as UpdateTargetMappingsMeta;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_META');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK when response is left wait_for_task_completion_timeout', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(
          updateTargetMappingsWaitForTaskState,
          res
        ) as UpdateTargetMappingsWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });

      test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK with incremented retry count when response is left wait_for_task_completion_timeout a second time', () => {
        const state = Object.assign({}, updateTargetMappingsWaitForTaskState, { retryCount: 1 });
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(state, res) as UpdateTargetMappingsWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(2);
        expect(newState.retryDelay).toEqual(4000);
      });
    });

    describe('UPDATE_TARGET_MAPPINGS_META', () => {
      const updateTargetMappingsMetaState: UpdateTargetMappingsMeta = {
        ...baseState,
        controlState: 'UPDATE_TARGET_MAPPINGS_META',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      test('UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS if the mapping _meta information is successfully updated', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_META'> = Either.right(
          'update_mappings_meta_succeeded'
        );
        const newState = model(updateTargetMappingsMetaState, res) as CheckVersionIndexReadyActions;
        expect(newState.controlState).toBe('CHECK_VERSION_INDEX_READY_ACTIONS');
      });
    });

    describe('CHECK_VERSION_INDEX_READY_ACTIONS', () => {
      const res: ResponseType<'CHECK_VERSION_INDEX_READY_ACTIONS'> = Either.right('noop');

      const postInitState: CheckVersionIndexReadyActions = {
        ...baseState,
        controlState: 'CHECK_VERSION_INDEX_READY_ACTIONS',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      test('CHECK_VERSION_INDEX_READY_ACTIONS -> MARK_VERSION_INDEX_READY if some versionIndexReadyActions', () => {
        const versionIndexReadyActions = Option.some([
          { add: { index: 'kibana-index', alias: 'my-alias' } },
        ]);

        const newState = model(
          {
            ...postInitState,
            versionIndexReadyActions,
          },
          res
        ) as PostInitState;
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE if none versionIndexReadyActions', () => {
        const newState = model(postInitState, res) as PostInitState;
        expect(newState.controlState).toEqual('DONE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('CREATE_NEW_TARGET', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const createNewTargetState: CreateNewTargetState = {
        ...baseState,
        controlState: 'CREATE_NEW_TARGET',
        versionIndexReadyActions: aliasActions,
        sourceIndex: Option.none as Option.None,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('CREATE_NEW_TARGET -> MARK_VERSION_INDEX_READY', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.right('create_index_succeeded');
        const newState = model(createNewTargetState, res);
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('CREATE_NEW_TARGET -> CREATE_NEW_TARGET if action fails with index_not_green_timeout', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.left({
          message: '[index_not_green_timeout] Timeout waiting for ...',
          type: 'index_not_green_timeout',
        });
        const newState = model(createNewTargetState, res);
        expect(newState.controlState).toEqual('CREATE_NEW_TARGET');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });
      test('CREATE_NEW_TARGET -> MARK_VERSION_INDEX_READY resets the retry count and delay', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.right('create_index_succeeded');
        const testState = {
          ...createNewTargetState,
          retryCount: 1,
          retryDelay: 2000,
        };

        const newState = model(testState, res);
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('CREATE_NEW_TARGET -> FATAL if action fails with cluster_shard_limit_exceeded', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.left({
          type: 'cluster_shard_limit_exceeded',
        });
        const newState = model(createNewTargetState, res);
        expect(newState.controlState).toEqual('FATAL');
        expect((newState as FatalState).reason).toMatchInlineSnapshot(
          `"[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources. See clusterShardLimitExceeded"`
        );
      });
    });

    describe('MARK_VERSION_INDEX_READY', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const markVersionIndexReadyState: MarkVersionIndexReady = {
        ...baseState,
        controlState: 'MARK_VERSION_INDEX_READY',
        versionIndexReadyActions: aliasActions,
        sourceIndex: Option.none as Option.None,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('MARK_VERSION_INDEX_READY -> DONE if the action succeeded', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY'> = Either.right(
          'update_aliases_succeeded'
        );
        const newState = model(markVersionIndexReadyState, res);
        expect(newState.controlState).toEqual('DONE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('MARK_VERSION_INDEX_READY -> MARK_VERSION_INDEX_CONFLICT if another removed the current alias from the source index', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY'> = Either.left({
          type: 'alias_not_found_exception',
        });
        const newState = model(markVersionIndexReadyState, res);
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY_CONFLICT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('MARK_VERSION_INDEX_READY -> MARK_VERSION_INDEX_CONFLICT if another node removed the temporary index', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY'> = Either.left({
          type: 'index_not_found_exception',
          index: '.kibana_7.11.0_reindex_temp',
        });
        const newState = model(markVersionIndexReadyState, res);
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY_CONFLICT');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });

    describe('MARK_VERSION_INDEX_READY_CONFLICT', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const markVersionIndexConflictState: MarkVersionIndexReadyConflict = {
        ...baseState,
        controlState: 'MARK_VERSION_INDEX_READY_CONFLICT',
        versionIndexReadyActions: aliasActions,
        sourceIndex: Option.none as Option.None,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('MARK_VERSION_INDEX_CONFLICT -> DONE if the current alias is pointing to the version alias', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY_CONFLICT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.11.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
          '.kibana_7.12.0_001': {
            aliases: { '.kibana_7.12.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(markVersionIndexConflictState, res);
        expect(newState.controlState).toEqual('DONE');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('MARK_VERSION_INDEX_READY_CONFLICT -> FATAL if the current alias is pointing to a different version index', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY_CONFLICT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: { '.kibana_7.11.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
          '.kibana_7.12.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.12.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(markVersionIndexConflictState, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"Multiple versions of Kibana are attempting a migration in parallel. Another Kibana instance on version 7.12.0 completed this migration (this instance is running 7.11.0). Ensure that all Kibana instances are running on same version and try again."`
        );
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('MARK_VERSION_INDEX_READY_CONFLICT -> FATAL if the current alias is pointing to a multiple indices', () => {
        const res: ResponseType<'MARK_VERSION_INDEX_READY_CONFLICT'> = Either.right({
          '.kibana_7.11.0_001': {
            aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
          '.kibana_7.12.0_001': {
            aliases: {
              '.kibana': {},
              '.kibana_7.12.0': {},
            },
            mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
            settings: {},
          },
        });
        const newState = model(markVersionIndexConflictState, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"The .kibana alias is pointing to multiple indices: .kibana_7.11.0_001,.kibana_7.12.0_001."`
        );
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });
  });
});
