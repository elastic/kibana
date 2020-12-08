/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import {
  FatalState,
  model,
  next,
  State,
  ResponseType,
  LegacySetWriteBlockState,
  SetSourceWriteBlockState,
  LegacyCreateReindexTargetState,
  LegacyReindexState,
  LegacyReindexWaitForTaskState,
  LegacyDeleteState,
  CloneSourceToTargetState,
  UpdateTargetMappingsState,
  UpdateTargetMappingsWaitForTaskState,
  OutdatedDocumentsSearch,
  OutdatedDocumentsTransform,
  MarkVersionIndexReady,
  CreateNewTargetState,
  BaseState,
} from '.';
import { SavedObjectsRawDoc } from '..';
import { ElasticsearchClient } from '../../elasticsearch';
import { AliasAction, RetryableEsClientError } from './actions';

describe('migrations v2', () => {
  const baseState: BaseState = {
    controlState: '',
    legacyIndex: '.kibana',
    kibanaVersion: '7.11.0',
    logs: [],
    retryCount: 0,
    retryDelay: 0,
    indexPrefix: '.kibana',
    outdatedDocumentsQuery: {},
    targetMappings: {
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
    preMigrationScript: Option.none,
  };

  test.todo('logs all messages');

  describe('model', () => {
    describe('exponential retry delays for retryable_es_client_error', () => {
      let state: State = {
        ...baseState,
        controlState: 'INIT',
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.11.0',
        versionIndex: '.kibana_7.11.0_001',
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

      test('terminates to FATAL after 10 retries', () => {
        const newState = model(
          { ...state, ...{ retryCount: 10, retryDelay: 64000 } },
          Either.left(retryableError)
        ) as FatalState;

        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"Unable to complete the INIT step after 10 attempts, terminating."`
        );
      });
    });

    describe('transitions from', () => {
      describe('INIT', () => {
        const initState: State = {
          ...baseState,
          controlState: 'INIT',
          currentAlias: '.kibana',
          versionAlias: '.kibana_7.11.0',
          versionIndex: '.kibana_7.11.0_001',
        };
        test('INIT -> UPDATE_TARGET_MAPPINGS if .kibana is already pointing to the target index', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: {
                '.kibana': {},
                '.kibana_7.11.0': {},
              },
              mappings: {
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
              },
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
          expect(newState.targetMappings).toMatchInlineSnapshot(`
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
        test('INIT -> SET_SOURCE_WRITE_BLOCK when .kibana points to an index with an invalid version', () => {
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

          expect(newState.controlState).toEqual('SET_SOURCE_WRITE_BLOCK');
          expect(newState).toMatchObject({
            controlState: 'SET_SOURCE_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_7.invalid.0_001'),
            targetIndex: '.kibana_7.11.0_001',
          });
        });
        test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from a v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
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
          );

          expect(newState).toMatchObject({
            controlState: 'SET_SOURCE_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_7.11.0_001'),
            targetIndex: '.kibana_7.12.0_001',
          });
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> SET_SOURCE_WRITE_BLOCK when migrating from a v1 migrations index (>= 6.5 < 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_3': {
              aliases: {
                '.kibana': {},
              },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState).toMatchObject({
            controlState: 'SET_SOURCE_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_3'),
            targetIndex: '.kibana_7.11.0_001',
          });
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('INIT -> LEGACY_SET_WRITE_BLOCK when migrating from a legacy index (>= 6.0.0 < 6.5)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana': {
              aliases: {},
              mappings: { properties: {}, _meta: {} },
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState).toMatchObject({
            controlState: 'LEGACY_SET_WRITE_BLOCK',
            sourceIndex: Option.some('.kibana_pre6.5.0_001'),
            targetIndex: '.kibana_7.11.0_001',
          });
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
          const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.right(
            'reindex_succeeded'
          );
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
        test('LEGACY_REINDEX_WAIT_FOR_TASK -> FATAL if action fails with index_not_found_exception for reindex target', () => {
          const res: ResponseType<'LEGACY_REINDEX_WAIT_FOR_TASK'> = Either.left({
            type: 'index_not_found_exception',
            index: 'source_index_name',
          });
          const newState = model(legacyReindexWaitForTaskState, res) as FatalState;
          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"LEGACY_REINDEX failed because the reindex destination index [source_index_name] does not exist."`
          );
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
        test('LEGACY_DELETE -> FATAL if action fails with index_not_found_exception for source index', () => {
          const res: ResponseType<'LEGACY_DELETE'> = Either.left({
            type: 'index_not_found_exception',
            index: 'source_index_name',
          });
          const newState = model(legacyDeleteState, res) as FatalState;
          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"LEGACY_DELETE failed because the source index [source_index_name] does not exist."`
          );
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
        test('SET_SOURCE_WRITE_BLOCK -> CLONE_SOURCE_TO_TARGET if action fails with index_not_found_exception', () => {
          const res: ResponseType<'SET_SOURCE_WRITE_BLOCK'> = Either.left({
            type: 'index_not_found_exception',
          });
          const newState = model(setWriteBlockState, res);
          expect(newState.controlState).toEqual('CLONE_SOURCE_TO_TARGET');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('SET_SOURCE_WRITE_BLOCK -> CLONE_SOURCE_TO_TARGET if action succeeds with set_write_block_succeeded', () => {
          const res: ResponseType<'SET_SOURCE_WRITE_BLOCK'> = Either.right(
            'set_write_block_succeeded'
          );
          const newState = model(setWriteBlockState, res);
          expect(newState.controlState).toEqual('CLONE_SOURCE_TO_TARGET');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
      });
      describe('CLONE_SOURCE_TO_TARGET', () => {
        const cloneSourceToTargetState: CloneSourceToTargetState = {
          ...baseState,
          controlState: 'CLONE_SOURCE_TO_TARGET',
          versionIndexReadyActions: Option.none,
          sourceIndex: Option.some('.kibana') as Option.Some<string>,
          targetIndex: '.kibana_7.11.0_001',
        };
        test('CLONE_SOURCE_TO_TARGET -> UPDATE_TARGET_MAPPINGS', () => {
          const res: ResponseType<'CLONE_SOURCE_TO_TARGET'> = Either.right({
            acknowledged: true,
            shardsAcknowledged: true,
          });
          const newState = model(cloneSourceToTargetState, res);
          expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS');
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
        test('UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK -> OUTDATED_DOCUMENTS_SEARCH', () => {
          const res: ResponseType<'UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK'> = Either.right(
            'pickup_updated_mappings_succeeded'
          );
          const newState = model(
            updateTargetMappingsWaitForTaskState,
            res
          ) as UpdateTargetMappingsWaitForTaskState;
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
        test('OUTDATED_DOCUMENTS_SEARCH -> MARK_VERSION_INDEX_READY if none outdated documents were found and some versionIndexReadyActions', () => {
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
          expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
          expect(newState.versionIndexReadyActions.value).toEqual(aliasActions);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });
        test('OUTDATED_DOCUMENTS_SEARCH -> DONE if none outdated documents were found and none versionIndexReadyActions', () => {
          const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH'> = Either.right({
            outdatedDocuments: [],
          });
          const newState = model(outdatedDocumentsSourchState, res);
          expect(newState.controlState).toEqual('DONE');
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
    });
  });

  describe('next', () => {
    it.todo('when state.retryDelay > 0 delays execution of the next action');
    it('DONE returns null', () => {
      const state: State = { ...baseState, ...{ controlState: 'DONE' } } as State;
      const action = next({} as ElasticsearchClient, (() => {}) as any, state);
      expect(action).toEqual(null);
    });
    it('FATAL returns null', () => {
      const state: State = { ...baseState, ...{ controlState: 'FATAL', reason: '' } };
      const action = next({} as ElasticsearchClient, (() => {}) as any, state);
      expect(action).toEqual(null);
    });
  });
});
