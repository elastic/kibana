/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
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
  ReindexSourceToTempIndex,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
  OutdatedDocumentsSearch,
  OutdatedDocumentsTransform,
  MarkVersionIndexReady,
  BaseState,
  CreateReindexTempState,
  MarkVersionIndexReadyConflict,
  CreateNewTargetState,
  CloneTempToSource,
  SetTempWriteBlock,
  WaitForYellowSourceState,
} from './types';
import { SavedObjectsRawDoc } from '..';
import { AliasAction, RetryableEsClientError } from './actions';
import { createInitialState, model } from './model';
import { ResponseType } from './next';
import { SavedObjectsMigrationConfigType } from '../saved_objects_config';

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
    unusedTypesQuery: Option.of({
      bool: {
        must_not: [
          {
            term: {
              type: 'unused-fleet-agent-events',
            },
          },
        ],
      },
    }),
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
    test('sets retryCount, exponential retryDelay if an action fails with a retryable_es_client_error', () => {
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

    test('resets retryCount, retryDelay when an action fails with a non-retryable error', () => {
      const legacyReindexState = {
        ...state,
        ...{ controlState: 'LEGACY_REINDEX_WAIT_FOR_TASK', retryCount: 5, retryDelay: 32000 },
      };
      const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
        type: 'target_index_had_write_block',
      });
      const newState = model(legacyReindexState as State, res);

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
        `"Unable to complete the INIT step after 15 attempts, terminating."`
      );
    });
  });

  describe('model transitions from', () => {
    describe('INIT', () => {
      const initState: State = {
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
      };

      test('INIT -> OUTDATED_DOCUMENTS_SEARCH if .kibana is already pointing to the target index', () => {
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

        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH');
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
              "disabled_saved_object_type": Object {
                "dynamic": false,
                "properties": Object {},
              },
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
        const res: ResponseType<'LEGACY_CREATE_REINDEX_TARGET'> = Either.right(
          'create_index_succeeded'
        );
        const newState = model(legacyCreateReindexTargetState, res);
        expect(newState.controlState).toEqual('LEGACY_REINDEX');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      // The createIndex action called by LEGACY_CREATE_REINDEX_TARGET never
      // returns a left, it will always succeed or timeout. Since timeout
      // failures are always retried we don't explicity test this logic
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
      };

      const waitForYellowSourceState: WaitForYellowSourceState = {
        ...baseState,
        controlState: 'WAIT_FOR_YELLOW_SOURCE',
        sourceIndex: Option.some('.kibana_3') as Option.Some<string>,
        sourceIndexMappings: mappingsWithUnknownType,
      };

      test('WAIT_FOR_YELLOW_SOURCE -> SET_SOURCE_WRITE_BLOCK if action succeeds', () => {
        const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.right({});
        const newState = model(waitForYellowSourceState, res);
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
              "disabled_saved_object_type": Object {
                "dynamic": false,
                "properties": Object {},
              },
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
      test('SET_SOURCE_WRITE_BLOCK -> CREATE_REINDEX_TEMP if action succeeds with set_write_block_succeeded', () => {
        const res: ResponseType<'SET_SOURCE_WRITE_BLOCK'> = Either.right(
          'set_write_block_succeeded'
        );
        const newState = model(setWriteBlockState, res);
        expect(newState.controlState).toEqual('CREATE_REINDEX_TEMP');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
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
      };

      it('REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_INDEX if the index has outdated documents to reindex', () => {
        const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
        const lastHitSortValue = [123456];
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
          outdatedDocuments,
          lastHitSortValue,
        });
        const newState = model(state, res) as ReindexSourceToTempIndex;
        expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_INDEX');
        expect(newState.outdatedDocuments).toBe(outdatedDocuments);
        expect(newState.lastHitSortValue).toBe(lastHitSortValue);
      });

      it('REINDEX_SOURCE_TO_TEMP_READ -> REINDEX_SOURCE_TO_TEMP_CLOSE_PIT if no outdated documents to reindex', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_READ'> = Either.right({
          outdatedDocuments: [],
          lastHitSortValue: undefined,
        });
        const newState = model(state, res) as ReindexSourceToTempClosePit;
        expect(newState.controlState).toBe('REINDEX_SOURCE_TO_TEMP_CLOSE_PIT');
        expect(newState.sourceIndexPitId).toBe('pit_id');
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
        const newState = model(state, res) as ReindexSourceToTempIndex;
        expect(newState.controlState).toBe('SET_TEMP_WRITE_BLOCK');
        expect(newState.sourceIndex).toEqual(state.sourceIndex);
      });
    });

    describe('REINDEX_SOURCE_TO_TEMP_INDEX', () => {
      const state: ReindexSourceToTempIndex = {
        ...baseState,
        controlState: 'REINDEX_SOURCE_TO_TEMP_INDEX',
        outdatedDocuments: [],
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexPitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        lastHitSortValue: undefined,
      };

      it('REINDEX_SOURCE_TO_TEMP_INDEX -> REINDEX_SOURCE_TO_TEMP_READ if action succeeded', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX'> = Either.right(
          'bulk_index_succeeded'
        );
        const newState = model(state, res);
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      it('REINDEX_SOURCE_TO_TEMP_INDEX -> REINDEX_SOURCE_TO_TEMP_READ when response is left target_index_had_write_block', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX'> = Either.left({
          type: 'target_index_had_write_block',
        });
        const newState = model(state, res) as ReindexSourceToTempRead;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      it('REINDEX_SOURCE_TO_TEMP_INDEX -> REINDEX_SOURCE_TO_TEMP_READ when response is left index_not_found_exception for temp index', () => {
        const res: ResponseType<'REINDEX_SOURCE_TO_TEMP_INDEX'> = Either.left({
          type: 'index_not_found_exception',
          index: state.tempIndex,
        });
        const newState = model(state, res) as ReindexSourceToTempRead;
        expect(newState.controlState).toEqual('REINDEX_SOURCE_TO_TEMP_READ');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
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
      it('CLONE_TEMP_TO_TARGET -> OUTDATED_DOCUMENTS_SEARCH if response is right', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.right({
          acknowledged: true,
          shardsAcknowledged: true,
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      it('CLONE_TEMP_TO_TARGET -> OUTDATED_DOCUMENTS_SEARCH if response is left index_not_fonud_exception', () => {
        const res: ResponseType<'CLONE_TEMP_TO_TARGET'> = Either.left({
          type: 'index_not_found_exception',
          index: 'temp_index',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });
    describe('OUTDATED_DOCUMENTS_SEARCH', () => {
      const outdatedDocumentsSourchState: OutdatedDocumentsSearch = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };
      test('OUTDATED_DOCUMENTS_SEARCH -> OUTDATED_DOCUMENTS_TRANSFORM if some outdated documents were found', () => {
        const outdatedDocuments = ([
          Symbol('raw saved object doc'),
        ] as unknown) as SavedObjectsRawDoc[];
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH'> = Either.right({
          outdatedDocuments,
        });
        const newState = model(outdatedDocumentsSourchState, res) as OutdatedDocumentsTransform;
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_TRANSFORM');
        expect(newState.outdatedDocuments).toEqual(outdatedDocuments);
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('OUTDATED_DOCUMENTS_SEARCH -> UPDATE_TARGET_MAPPINGS if none outdated documents were found and some versionIndexReadyActions', () => {
        const aliasActions = ([Symbol('alias action')] as unknown) as AliasAction[];
        const outdatedDocumentsSourchStateWithSomeVersionIndexReadyActions = {
          ...outdatedDocumentsSourchState,
          ...{
            versionIndexReadyActions: Option.some(aliasActions),
          },
        };
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH'> = Either.right({
          outdatedDocuments: [],
        });
        const newState = model(
          outdatedDocumentsSourchStateWithSomeVersionIndexReadyActions,
          res
        ) as MarkVersionIndexReady;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
        expect(newState.versionIndexReadyActions.value).toEqual(aliasActions);
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('OUTDATED_DOCUMENTS_SEARCH -> UPDATE_TARGET_MAPPINGS if none outdated documents were found and none versionIndexReadyActions', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH'> = Either.right({
          outdatedDocuments: [],
        });
        const newState = model(outdatedDocumentsSourchState, res);
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
    });
    describe('OUTDATED_DOCUMENTS_TRANSFORM', () => {
      const outdatedDocuments = ([
        Symbol('raw saved object doc'),
      ] as unknown) as SavedObjectsRawDoc[];
      const outdatedDocumentsTransformState: OutdatedDocumentsTransform = {
        ...baseState,
        controlState: 'OUTDATED_DOCUMENTS_TRANSFORM',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        outdatedDocuments,
      };
      test('OUTDATED_DOCUMENTS_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH if action succeeds', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.right(
          'bulk_index_succeeded'
        );
        const newState = model(outdatedDocumentsTransformState, res);
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
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
      test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> MARK_VERSION_INDEX_READY if some versionIndexReadyActions', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.right(
          'pickup_updated_mappings_succeeded'
        );
        const newState = model(
          {
            ...updateTargetMappingsWaitForTaskState,
            versionIndexReadyActions: Option.some([
              { add: { index: 'kibana-index', alias: 'my-alias' } },
            ]),
          },
          res
        ) as UpdateTargetMappingsWaitForTaskState;
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });
      test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> DONE if none versionIndexReadyActions', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.right(
          'pickup_updated_mappings_succeeded'
        );
        const newState = model(
          updateTargetMappingsWaitForTaskState,
          res
        ) as UpdateTargetMappingsWaitForTaskState;
        expect(newState.controlState).toEqual('DONE');
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
    });
  });
  describe('createInitialState', () => {
    const migrationsConfig = ({
      retryAttempts: 15,
      batchSize: 1000,
    } as unknown) as SavedObjectsMigrationConfigType;
    it('creates the initial state for the model based on the passed in paramaters', () => {
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
        })
      ).toMatchInlineSnapshot(`
        Object {
          "batchSize": 1000,
          "controlState": "INIT",
          "currentAlias": ".kibana_task_manager",
          "indexPrefix": ".kibana_task_manager",
          "kibanaVersion": "8.1.0",
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
            "_tag": "Some",
            "value": Object {
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
          },
          "versionAlias": ".kibana_task_manager_8.1.0",
          "versionIndex": ".kibana_task_manager_8.1.0_001",
        }
      `);
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
});
