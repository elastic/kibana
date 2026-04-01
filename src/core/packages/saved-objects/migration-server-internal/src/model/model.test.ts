/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chain } from 'lodash';
import * as Either from 'fp-ts/Either';
import * as Option from 'fp-ts/Option';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type {
  BaseState,
  UpdateSourceMappingsPropertiesState,
  CheckTargetTypesMappingsState,
  CheckVersionIndexReadyActions,
  CleanupUnknownAndExcluded,
  CleanupUnknownAndExcludedWaitForTaskState,
  CreateNewTargetState,
  FatalState,
  MarkVersionIndexReady,
  MarkVersionIndexReadyConflict,
  OutdatedDocumentsSearchClosePit,
  OutdatedDocumentsSearchOpenPit,
  OutdatedDocumentsSearchRead,
  OutdatedDocumentsTransform,
  PrepareCompatibleMigration,
  State,
  TransformedDocumentsBulkIndex,
  UpdateTargetMappingsMeta,
  UpdateTargetMappingsPropertiesState,
  UpdateTargetMappingsPropertiesWaitForTaskState,
  WaitForYellowSourceState,
  PostInitState,
  CreateIndexCheckClusterRoutingAllocationState,
} from '../state';
import { type TransformErrorObjects, TransformSavedObjectDocumentError } from '../core';
import type { AliasAction, RetryableEsClientError } from '../actions';
import type { ResponseType } from '../next';
import { createInitialProgress } from './progress';
import { model } from './model';
import type { BulkIndexOperationTuple, BulkOperation } from './create_batches';
import type { TaskCompletedWithRetriableError } from '../actions/wait_for_task';

describe('migrations v2 model', () => {
  const indexMapping: IndexMapping = {
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
  };
  const baseState: BaseState = {
    controlState: '',
    kibanaVersion: '7.11.0',
    logs: [],
    retryCount: 0,
    skipRetryReset: false,
    retryDelay: 0,
    retryAttempts: 15,
    batchSize: 1000,
    maxBatchSize: 1000,
    maxBatchSizeBytes: 1e8,
    maxReadBatchSizeBytes: 1234,
    discardUnknownObjects: false,
    discardCorruptObjects: false,
    indexPrefix: '.kibana',
    outdatedDocumentsQuery: {},
    targetIndexMappings: indexMapping,
    currentAlias: '.kibana',
    versionAlias: '.kibana_7.11.0',
    versionIndex: '.kibana_7.11.0_001',
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
    indexTypes: ['config'],
    knownTypes: ['dashboard', 'config'],
    latestMappingsVersions: {
      config: '10.3.0',
      dashboard: '10.3.0',
    },
    hashToVersionMap: {
      'config|someHash': '10.1.0',
      'dashboard|anotherHash': '10.2.0',
    },
    excludeFromUpgradeFilterHooks: {},
    migrationDocLinks: {
      resolveMigrationFailures: 'https://someurl.co/',
      repeatedTimeoutRequests: 'repeatedTimeoutRequests',
      routingAllocationDisabled: 'routingAllocationDisabled',
      clusterShardLimitExceeded: 'clusterShardLimitExceeded',
    },
    waitForMigrationCompletion: false,
    esCapabilities: elasticsearchServiceMock.createCapabilities(),
  };
  const postInitState = {
    ...baseState,
    aliases: {},
    sourceIndex: Option.none,
    sourceIndexMappings: Option.none,
    versionIndexReadyActions: Option.none,
    targetIndex: '.kibana_7.11.0_001',
  };

  const aProcessedDoc = {
    _id: 'a:b',
    _source: { type: 'a', a: { name: 'HOI!' }, migrationVersion: {}, references: [] },
  };

  const processedDocs: SavedObjectsRawDoc[] = [aProcessedDoc];

  const bulkOperationBatches: BulkOperation[][] = [
    [
      [
        {
          index: {
            _id: aProcessedDoc._id,
          },
        },
        aProcessedDoc._source,
      ],
    ],
  ];

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
        const newState = model(initBaseState, res) as FatalState;

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
        const newState = model(initBaseState, res) as FatalState;

        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"The .kibana alias is pointing to multiple indices: .kibana_7.12.0_001,.kibana_7.11.0_001."`
        );
      });

      describe('if waitForMigrationCompletion=true', () => {
        const initState = Object.assign({}, initBaseState, {
          waitForMigrationCompletion: true,
        });

        test('INIT -> FATAL when later version alias exists', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana_7.12.0': {}, '.kibana': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"The .kibana_7.12.0 alias refers to a newer version of Kibana: v7.12.0"`
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
                '.kibana_7.11.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_7.10.0_001': {
              aliases: { '.kibana_7.10.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res);

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect(newState.retryDelay).toBe(2000);
        });

        test('INIT -> WAIT_FOR_MIGRATION_COMPLETION when migrating from a v2 migrations index (>= 7.11.0)', () => {
          const res: ResponseType<'INIT'> = Either.right({
            '.kibana_7.11.0_001': {
              aliases: { '.kibana': {}, '.kibana_7.11.0': {} },
              mappings: {
                properties: {},
                _meta: {
                  mappingVersions: {
                    someTypeWithMigrations: '8.8.0',
                    someTypeWithModelVersions: '10.1.0',
                  },
                },
              },
              settings: {},
            },
            '.kibana_3': {
              aliases: {},
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState: PostInitState = model(
            {
              ...initState,
              kibanaVersion: '7.12.0',
              versionAlias: '.kibana_7.12.0',
              versionIndex: '.kibana_7.12.0_001',
            },
            res
          ) as PostInitState;

          expect(newState.controlState).toBe('WAIT_FOR_MIGRATION_COMPLETION');
          expect((newState.sourceIndexMappings as Option.Some<IndexMapping>).value).toEqual({
            _meta: {
              mappingVersions: {
                // notice how the logic defaulted to 10.0.0 for types that ONLY define 'migrations:' property
                someTypeWithMigrations: '10.0.0',
                someTypeWithModelVersions: '10.1.0',
              },
            },
            properties: {},
          });
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
          const newState = model(initState, res);

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
          );

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
          );

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
                '.kibana_7.11.0': {},
              },
              mappings: mappingsWithUnknownType,
              settings: {},
            },
            '.kibana_7.10.0_001': {
              aliases: { '.kibana_7.10.0': {} },
              mappings: { properties: {}, _meta: { migrationMappingPropertyHashes: {} } },
              settings: {},
            },
          });
          const newState = model(initState, res) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('.kibana_7.invalid.0_001');
          expect(newState.aliases).toEqual({
            '.kibana': '.kibana_7.invalid.0_001',
            '.kibana_7.10.0': '.kibana_7.10.0_001',
            '.kibana_7.11.0': '.kibana_7.invalid.0_001',
          });
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
              kibanaVersion: '7.12.0',
              versionAlias: '.kibana_7.12.0',
              versionIndex: '.kibana_7.12.0_001',
            },
            res
          ) as WaitForYellowSourceState;

          expect(newState.controlState).toBe('WAIT_FOR_YELLOW_SOURCE');
          expect(newState.sourceIndex.value).toBe('.kibana_7.11.0_001');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
          expect(newState.aliases).toEqual({
            '.kibana': '.kibana_7.11.0_001',
            '.kibana_7.11.0': '.kibana_7.11.0_001',
          });
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
          expect(newState.aliases).toEqual({
            '.kibana': '.kibana_3',
          });
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

        test('INIT -> CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION when the index does not exist and the migrator is NOT involved in a relocation', () => {
          const res: ResponseType<'INIT'> = Either.right({});
          const newState = model(initState, res);

          expect(newState).toMatchObject({
            controlState: 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION',
            sourceIndex: Option.none,
            targetIndex: '.kibana_7.11.0_001',
          });
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });

      });
    });

    describe('CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const createIndexCheckClusterRoutingAllocationState: CreateIndexCheckClusterRoutingAllocationState =
        {
          ...postInitState,
          controlState: 'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION',
          versionIndexReadyActions: aliasActions,
          sourceIndex: Option.none as Option.None,
          targetIndex: '.kibana_7.11.0_001',
        };

      test('CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION -> CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION when cluster allocation is not compatible', () => {
        const res: ResponseType<'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION'> = Either.left({
          type: 'incompatible_cluster_routing_allocation',
        });
        const newState = model(createIndexCheckClusterRoutingAllocationState, res);

        expect(newState.controlState).toBe('CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });

      test('CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION -> CREATE_NEW_TARGET when cluster allocation is compatible', () => {
        const res: ResponseType<'CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION'> = Either.right({});
        const newState = model(
          createIndexCheckClusterRoutingAllocationState,
          res
        ) as CreateNewTargetState;

        expect(newState.controlState).toBe('CREATE_NEW_TARGET');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
        // check that we are correctly "forwarding" the state
        expect(newState.targetIndex).toEqual(
          createIndexCheckClusterRoutingAllocationState.targetIndex
        );
        expect(newState.targetIndexMappings).toEqual(
          createIndexCheckClusterRoutingAllocationState.targetIndexMappings
        );
        expect(newState.esCapabilities).toEqual(
          createIndexCheckClusterRoutingAllocationState.esCapabilities
        );
      });
    });

    describe('WAIT_FOR_MIGRATION_COMPLETION', () => {
      const waitForMState: State = {
        ...postInitState,
        controlState: 'WAIT_FOR_MIGRATION_COMPLETION',
        sourceIndex: Option.some('.kibana_7.11.0_001'),
        sourceIndexMappings: Option.none,
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
        const newState = model(waitForMState, res);

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
        );

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
        const newState = model(waitForMState, res);

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
        );

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
        );

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

    describe('WAIT_FOR_YELLOW_SOURCE', () => {
      const waitForYellowSourceState: WaitForYellowSourceState = {
        ...postInitState,
        controlState: 'WAIT_FOR_YELLOW_SOURCE',
        sourceIndex: Option.some('.kibana_7.11.0_001') as Option.Some<string>,
        sourceIndexMappings: Option.some(
          baseState.targetIndexMappings
        ) as Option.Some<IndexMapping>,
      };

      describe('if action succeeds', () => {
        test('it resets retry count and delay', () => {
          const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.right({});
          const testState = {
            ...waitForYellowSourceState,
            retryCount: 1,
            retryDelay: 2000,
          };
          const newState = model(testState, res);
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });

        describe('if the migrator is NOT involved in a relocation', () => {
          test('WAIT_FOR_YELLOW_SOURCE -> UPDATE_SOURCE_MAPPINGS_PROPERTIES', () => {
            const res: ResponseType<'WAIT_FOR_YELLOW_SOURCE'> = Either.right({});
            const newState = model(waitForYellowSourceState, res);
            expect(newState.controlState).toEqual('UPDATE_SOURCE_MAPPINGS_PROPERTIES');
          });
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
    });

    describe('UPDATE_SOURCE_MAPPINGS_PROPERTIES', () => {
      const updateSourceMappingsPropertiesState: UpdateSourceMappingsPropertiesState = {
        ...postInitState,
        aliases: {
          '.kibana_7.11.0': '.kibana_7.11.0_001',
        },
        controlState: 'UPDATE_SOURCE_MAPPINGS_PROPERTIES',
        sourceIndex: Option.some('.kibana_7.11.0_001') as Option.Some<string>,
        sourceIndexMappings: Option.some(
          chain(baseState.targetIndexMappings)
            .cloneDeep()
            .set('_meta.migrationMappingPropertyHashes.something', 'some-hash')
            .value()
        ) as Option.Some<IndexMapping>,
      };

      describe('if action succeeds', () => {
        test('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> CLEANUP_UNKNOWN_AND_EXCLUDED if mappings changes are compatible and index is not migrated yet', () => {
          const res: ResponseType<'UPDATE_SOURCE_MAPPINGS_PROPERTIES'> = Either.right(
            'update_mappings_succeeded'
          );
          const newState = model(updateSourceMappingsPropertiesState, res);
          expect(newState.controlState).toEqual('CLEANUP_UNKNOWN_AND_EXCLUDED');
        });

        test('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if mappings changes are compatible and index is already migrated', () => {
          const res: ResponseType<'UPDATE_SOURCE_MAPPINGS_PROPERTIES'> = Either.right(
            'update_mappings_succeeded'
          );
          const newState = model(
            chain(updateSourceMappingsPropertiesState)
              .cloneDeep()
              .set(['aliases', '.kibana'], '.kibana_7.11.0_001')
              .value(),
            res
          );

          expect(newState).toEqual(
            expect.objectContaining({
              controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
              sourceIndex: Option.none,
              targetIndex: '.kibana_7.11.0_001',
              targetIndexMappings: chain(indexMapping)
                .cloneDeep()
                .set('_meta.migrationMappingPropertyHashes.something', 'some-hash')
                .value(),
            })
          );
        });
      });

      describe('if action fails', () => {
        test('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> FATAL if mappings changes are incompatible', () => {
          const res: ResponseType<'UPDATE_SOURCE_MAPPINGS_PROPERTIES'> = Either.left({
            type: 'incompatible_mapping_exception',
          });
          const newState = model(updateSourceMappingsPropertiesState, res) as FatalState;
          expect(newState.controlState).toEqual('FATAL');
        });

        test('UPDATE_SOURCE_MAPPINGS_PROPERTIES -> FATAL', () => {
          const res: ResponseType<'UPDATE_SOURCE_MAPPINGS_PROPERTIES'> = Either.left({
            type: 'incompatible_mapping_exception',
          });
          const newState = model(
            chain(updateSourceMappingsPropertiesState)
              .cloneDeep()
              .set(['aliases', '.kibana'], '.kibana_7.11.0_001')
              .value(),
            res
          ) as FatalState;

          expect(newState.controlState).toEqual('FATAL');
          expect(newState.reason).toMatchInlineSnapshot(
            `"Incompatible mappings change on already migrated Kibana instance."`
          );
        });
      });
    });

    describe('CLEANUP_UNKNOWN_AND_EXCLUDED', () => {
      const cleanupUnknownAndExcluded: CleanupUnknownAndExcluded = {
        ...postInitState,
        controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED',
        sourceIndex: Option.some('.kibana_7.11.0_001') as Option.Some<string>,
        sourceIndexMappings: Option.some(
          baseState.targetIndexMappings
        ) as Option.Some<IndexMapping>,
        targetIndex: baseState.versionIndex,
        kibanaVersion: '7.12.0', // new version!
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.12.0',
      };

      describe('if action succeeds', () => {
        test('CLEANUP_UNKNOWN_AND_EXCLUDED -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK', () => {
          const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED'> = Either.right({
            type: 'cleanup_started' as const,
            taskId: '1234',
            unknownDocs: [],
            errorsByType: {},
          });
          const newState = model(cleanupUnknownAndExcluded, res);

          expect(newState.controlState).toEqual('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK');
        });

        test('CLEANUP_UNKNOWN_AND_EXCLUDED -> PREPARE_COMPATIBLE_MIGRATION', () => {
          const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED'> = Either.right({
            type: 'cleanup_not_needed' as const,
          });
          const newState = model(cleanupUnknownAndExcluded, res);

          expect(newState.controlState).toEqual('PREPARE_COMPATIBLE_MIGRATION');
        });
      });

      test('CLEANUP_UNKNOWN_AND_EXCLUDED -> FATAL if discardUnknownObjects=false', () => {
        const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED'> = Either.left({
          type: 'unknown_docs_found' as const,
          unknownDocs: [
            { id: 'dashboard:12', type: 'dashboard' },
            { id: 'foo:17', type: 'foo' },
          ],
        });

        const newState = model(cleanupUnknownAndExcluded, res);

        expect(newState).toMatchObject({
          controlState: 'FATAL',
          reason: expect.stringContaining(
            'Migration failed because some documents were found which use unknown saved object types'
          ),
        });
      });
    });

    describe('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK', () => {
      const cleanupUnknownAndExcludedWaitForTask: CleanupUnknownAndExcludedWaitForTaskState = {
        ...postInitState,
        controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK',
        deleteByQueryTaskId: '1234',
        sourceIndex: Option.some('.kibana_7.11.0_001') as Option.Some<string>,
        sourceIndexMappings: Option.some(
          baseState.targetIndexMappings
        ) as Option.Some<IndexMapping>,
        targetIndex: baseState.versionIndex,
        kibanaVersion: '7.12.0', // new version!
        currentAlias: '.kibana',
        versionAlias: '.kibana_7.12.0',
        aliases: {
          '.kibana': '.kibana_7.11.0_001',
          '.kibana_7.11.0': '.kibana_7.11.0_001',
        },
      };

      test('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK when response is left wait_for_task_completion_timeout', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(cleanupUnknownAndExcludedWaitForTask, res);
        expect(newState.controlState).toEqual('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });

      test('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> PREPARE_COMPATIBLE_MIGRATION if action succeeds', () => {
        const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'> = Either.right({
          type: 'cleanup_successful' as const,
        });
        const newState = model(
          cleanupUnknownAndExcludedWaitForTask,
          res
        ) as PrepareCompatibleMigration;

        expect(newState.controlState).toEqual('PREPARE_COMPATIBLE_MIGRATION');
        expect(newState.targetIndexMappings).toEqual(indexMapping);
        expect(newState.preTransformDocsActions).toEqual([
          {
            add: {
              alias: '.kibana_7.12.0',
              index: '.kibana_7.11.0_001',
            },
          },
          {
            remove: {
              alias: '.kibana_7.11.0',
              index: '.kibana_7.11.0_001',
              must_exist: true,
            },
          },
        ]);
      });

      test('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> CLEANUP_UNKNOWN_AND_EXCLUDED if the deleteQuery fails and we have some attempts left', () => {
        const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'> = Either.left({
          type: 'cleanup_failed' as const,
          failures: ['Failed to delete dashboard:12345', 'Failed to delete dashboard:67890'],
          versionConflicts: 12,
        });

        const newState = model(cleanupUnknownAndExcludedWaitForTask, res);

        expect(newState).toMatchObject({
          controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED',
          logs: [
            {
              level: 'warning',
              message:
                'Errors occurred whilst deleting unwanted documents. Another instance is probably updating or deleting documents in the same index. Retrying attempt 1.',
            },
          ],
        });
      });

      test('CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK -> FAIL if the deleteQuery fails after N retries', () => {
        const res: ResponseType<'CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK'> = Either.left({
          type: 'cleanup_failed' as const,
          failures: ['Failed to delete dashboard:12345', 'Failed to delete dashboard:67890'],
        });

        const newState = model(
          {
            ...cleanupUnknownAndExcludedWaitForTask,
            retryCount: cleanupUnknownAndExcludedWaitForTask.retryAttempts,
          },
          res
        );

        expect(newState).toMatchObject({
          controlState: 'FATAL',
          reason: expect.stringContaining(
            'Migration failed because it was unable to delete unwanted documents from the .kibana_7.11.0_001 system index'
          ),
        });
      });
    });

    describe('PREPARE_COMPATIBLE_MIGRATIONS', () => {
      const someAliasAction: AliasAction = { add: { index: '.kibana', alias: '.kibana_8.7.0' } };
      const state: PrepareCompatibleMigration = {
        ...postInitState,
        controlState: 'PREPARE_COMPATIBLE_MIGRATION',
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        sourceIndexMappings: Option.some({}) as Option.Some<IndexMapping>,
        preTransformDocsActions: [someAliasAction],
      };

      it('PREPARE_COMPATIBLE_MIGRATIONS -> REFRESH_SOURCE if action succeeds  and we must refresh the index', () => {
        const res: ResponseType<'PREPARE_COMPATIBLE_MIGRATION'> = Either.right(
          'update_aliases_succeeded'
        );
        const newState = model(
          { ...state, mustRefresh: true },
          res
        ) as OutdatedDocumentsSearchOpenPit;
        expect(newState.controlState).toEqual('REFRESH_SOURCE');
        expect(newState.versionIndexReadyActions).toEqual(Option.none);
      });

      it('PREPARE_COMPATIBLE_MIGRATIONS -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if action succeeds', () => {
        const res: ResponseType<'PREPARE_COMPATIBLE_MIGRATION'> = Either.right(
          'update_aliases_succeeded'
        );
        const newState = model(state, res) as OutdatedDocumentsSearchOpenPit;
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
        expect(newState.versionIndexReadyActions).toEqual(Option.none);
      });

      it('PREPARE_COMPATIBLE_MIGRATIONS -> REFRESH_SOURCE if action fails because the alias is not found', () => {
        const res: ResponseType<'PREPARE_COMPATIBLE_MIGRATION'> = Either.left({
          type: 'alias_not_found_exception',
        });

        const newState = model(
          { ...state, mustRefresh: true },
          res
        ) as OutdatedDocumentsSearchOpenPit;
        expect(newState.controlState).toEqual('REFRESH_SOURCE');
        expect(newState.versionIndexReadyActions).toEqual(Option.none);
      });

      it('PREPARE_COMPATIBLE_MIGRATIONS -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT if action fails because the alias is not found', () => {
        const res: ResponseType<'PREPARE_COMPATIBLE_MIGRATION'> = Either.left({
          type: 'alias_not_found_exception',
        });

        const newState = model(state, res) as OutdatedDocumentsSearchOpenPit;
        expect(newState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT');
        expect(newState.versionIndexReadyActions).toEqual(Option.none);
      });

      it('throws an exception if action fails with an error other than a missing alias', () => {
        const res: ResponseType<'PREPARE_COMPATIBLE_MIGRATION'> = Either.left({
          type: 'remove_index_not_a_concrete_index',
        });

        expect(() => model(state, res)).toThrowErrorMatchingInlineSnapshot(
          `"PREPARE_COMPATIBLE_MIGRATION received unexpected action response: {\\"type\\":\\"remove_index_not_a_concrete_index\\"}"`
        );
      });
    });

    describe('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT', () => {
      const state: OutdatedDocumentsSearchOpenPit = {
        ...postInitState,
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
        ...postInitState,
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
          pitId: 'refreshed_pit_id',
          lastHitSortValue,
          totalHits: 10,
        });
        const newState = model(state, res) as OutdatedDocumentsTransform;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_TRANSFORM');
        expect(newState.pitId).toBe('refreshed_pit_id');
        expect(newState.outdatedDocuments).toBe(outdatedDocuments);
        expect(newState.lastHitSortValue).toBe(lastHitSortValue);
        expect(newState.progress.processed).toBe(undefined);
        expect(newState.progress.total).toBe(10);
        expect(newState.maxBatchSize).toBe(1000);
        expect(newState.batchSize).toBe(1000); // don't increase batchsize above default
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
          pitId: 'pit_id',
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

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_TRANSFORM increases batchSize up to maxBatchSize', () => {
        const outdatedDocuments = [{ _id: '1', _source: { type: 'vis' } }];
        const lastHitSortValue = [123456];
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments,
          pitId: 'pit_id',
          lastHitSortValue,
          totalHits: 1,
          processedDocs: [],
        });
        let newState = model({ ...state, batchSize: 500 }, res) as OutdatedDocumentsTransform;
        expect(newState.batchSize).toBe(600);
        newState = model({ ...state, batchSize: 600 }, res) as OutdatedDocumentsTransform;
        expect(newState.batchSize).toBe(720);
        newState = model({ ...state, batchSize: 720 }, res) as OutdatedDocumentsTransform;
        expect(newState.batchSize).toBe(864);
        newState = model({ ...state, batchSize: 864 }, res) as OutdatedDocumentsTransform;
        expect(newState.batchSize).toBe(1000); // + 20% would have been 1036
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_TRANSFORM');
        expect(newState.maxBatchSize).toBe(1000);
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_READ if left es_response_too_large', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.left({
          type: 'es_response_too_large',
          contentLength: 3456,
        });
        const newState = model(state, res) as OutdatedDocumentsSearchRead;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_READ');
        expect(newState.lastHitSortValue).toBe(undefined); // lastHitSortValue should not be set
        expect(newState.progress.processed).toBe(undefined); // don't increment progress
        expect(newState.batchSize).toBe(500); // halves the batch size
        expect(newState.maxBatchSize).toBe(1000); // leaves maxBatchSize unchanged
        expect(newState.logs).toMatchInlineSnapshot(`
          Array [
            Object {
              "level": "warning",
              "message": "Read a batch with a response content length of 3456 bytes which exceeds migrations.maxReadBatchSizeBytes, retrying by reducing the batch size in half to 500.",
            },
          ]
        `);
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_READ if left es_response_too_large will not reduce batch size below 1', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.left({
          type: 'es_response_too_large',
          contentLength: 2345,
        });
        const newState = model({ ...state, batchSize: 1.5 }, res) as OutdatedDocumentsSearchRead;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_READ');
        expect(newState.lastHitSortValue).toBe(undefined); // lastHitSortValue should not be set
        expect(newState.progress.processed).toBe(undefined); // don't increment progress
        expect(newState.batchSize).toBe(1); // don't halve the batch size or go below 1
        expect(newState.maxBatchSize).toBe(1000); // leaves maxBatchSize unchanged
        expect(newState.logs).toMatchInlineSnapshot(`
          Array [
            Object {
              "level": "warning",
              "message": "Read a batch with a response content length of 2345 bytes which exceeds migrations.maxReadBatchSizeBytes, retrying by reducing the batch size in half to 1.",
            },
          ]
        `);
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL if left es_response_too_large and batchSize already 1', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.left({
          type: 'es_response_too_large',
          contentLength: 2345,
        });
        const newState = model({ ...state, batchSize: 1 }, res) as FatalState;
        expect(newState.controlState).toBe('FATAL');
        expect(newState.batchSize).toBe(1); // don't halve the batch size or go below 1
        expect(newState.maxBatchSize).toBe(1000); // leaves maxBatchSize unchanged
        expect(newState.reason).toMatchInlineSnapshot(
          `"After reducing the read batch size to a single document, the response content length was 2345 bytes which still exceeded migrations.maxReadBatchSizeBytes. Increase migrations.maxReadBatchSizeBytes and try again."`
        );
      });

      it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT if no outdated documents to transform', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_READ'> = Either.right({
          outdatedDocuments: [],
          pitId: 'refreshed_pit_id',
          lastHitSortValue: undefined,
          totalHits: undefined,
        });
        const newState = model(state, res) as OutdatedDocumentsSearchClosePit;
        expect(newState.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT');
        expect(newState.pitId).toBe('refreshed_pit_id');
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
          pitId: 'pit_id',
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
        ...postInitState,
        controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        pitId: 'pit_id',
        targetIndex: '.kibana_7.11.0_001',
        hasTransformedDocs: false,
      };

      it('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> CHECK_TARGET_MAPPINGS if action succeeded', () => {
        const res: ResponseType<'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'> = Either.right({});
        const newState = model(state, res) as CheckTargetTypesMappingsState;
        expect(newState.controlState).toBe('CHECK_TARGET_MAPPINGS');
        // @ts-expect-error pitId shouldn't leak outside
        expect(newState.pitId).toBe(undefined);
      });
    });

    describe('CHECK_TARGET_MAPPINGS', () => {
      const checkTargetTypesMappingsState: CheckTargetTypesMappingsState = {
        ...postInitState,
        controlState: 'CHECK_TARGET_MAPPINGS',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      describe('reindex migration', () => {
        it('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES if origin mappings did not exist', () => {
          const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.left({
            type: 'index_mappings_incomplete' as const,
          });
          const newState = model(
            checkTargetTypesMappingsState,
            res
          ) as UpdateTargetMappingsPropertiesState;
          expect(newState.controlState).toBe('UPDATE_TARGET_MAPPINGS_PROPERTIES');
          expect(Option.isNone(newState.updatedTypesQuery)).toEqual(true);
        });
      });

      describe('compatible migration', () => {
        it('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_PROPERTIES if SO types have changed', () => {
          const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.left({
            type: 'types_changed' as const,
            updatedFields: [],
            updatedTypes: ['dashboard', 'lens'],
          });
          const newState = model(
            checkTargetTypesMappingsState,
            res
          ) as UpdateTargetMappingsPropertiesState;
          expect(newState.controlState).toBe('UPDATE_TARGET_MAPPINGS_PROPERTIES');
          expect(
            Option.isSome(newState.updatedTypesQuery) && newState.updatedTypesQuery.value
          ).toEqual({
            bool: {
              should: [
                {
                  term: {
                    type: 'dashboard',
                  },
                },
                {
                  term: {
                    type: 'lens',
                  },
                },
              ],
            },
          });
        });

        it('CHECK_TARGET_MAPPINGS -> UPDATE_TARGET_MAPPINGS_META if ONLY new SO types have been added', () => {
          const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.left({
            type: 'types_added' as const,
            updatedFields: [],
            newTypes: ['newFeatureType'],
          });
          const newState = model(checkTargetTypesMappingsState, res) as UpdateTargetMappingsMeta;
          expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_META');
          expect(newState.retryCount).toEqual(0);
          expect(newState.retryDelay).toEqual(0);
        });

        it('CHECK_TARGET_MAPPINGS -> CHECK_VERSION_INDEX_READY_ACTIONS if types match (there might be additions in core fields)', () => {
          const res: ResponseType<'CHECK_TARGET_MAPPINGS'> = Either.right({
            type: 'types_match' as const,
          });
          const newState = model(
            checkTargetTypesMappingsState,
            res
          ) as CheckVersionIndexReadyActions;
          expect(newState.controlState).toBe('CHECK_VERSION_INDEX_READY_ACTIONS');
        });
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
        aliases: {},
        sourceIndexMappings: Option.none,
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
        test('OUTDATED_DOCUMENTS_TRANSFORM -> TRANSFORMED_DOCUMENTS_BULK_INDEX if action succeeds', () => {
          const res: ResponseType<'OUTDATED_DOCUMENTS_TRANSFORM'> = Either.right({ processedDocs });
          const newState = model(
            outdatedDocumentsTransformState,
            res
          ) as TransformedDocumentsBulkIndex;
          expect(newState.controlState).toEqual('TRANSFORMED_DOCUMENTS_BULK_INDEX');
          expect(newState.bulkOperationBatches).toEqual(bulkOperationBatches);
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
      const idToIndexOperation = (_id: string): BulkIndexOperationTuple => [
        // "index" operations have a first part with the operation and the SO id
        {
          index: {
            _id,
          },
        },
        // and a second part with the object _source
        { type: 'a', a: { name: `HOI ${_id}!` }, migrationVersion: {}, references: [] },
        // these two parts are then serialized to NDJSON by esClient and sent over with POST _bulk
      ];

      const customBulkOperationBatches: BulkOperation[][] = [
        // batch 0
        ['a:b', 'a:c'].map(idToIndexOperation),
        // batch 1
        ['a:d'].map(idToIndexOperation),
      ];
      const transformedDocumentsBulkIndexState: TransformedDocumentsBulkIndex = {
        ...postInitState,
        controlState: 'TRANSFORMED_DOCUMENTS_BULK_INDEX',
        bulkOperationBatches: customBulkOperationBatches,
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

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX retries with exponential backoff on unavailable_shards_exception', () => {
        const res: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> = Either.left({
          type: 'unavailable_shards_exception' as const,
          message: 'Not enough active copies to meet shard count of [ALL]',
        });
        const newState = model(transformedDocumentsBulkIndexState, res);
        expect(newState.controlState).toEqual('TRANSFORMED_DOCUMENTS_BULK_INDEX');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });

      test('TRANSFORMED_DOCUMENTS_BULK_INDEX recovers after unavailable_shards_exception retry', () => {
        // First call: unavailable_shards_exception triggers retry
        const errorRes: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> = Either.left({
          type: 'unavailable_shards_exception' as const,
          message: 'Not enough active copies to meet shard count of [ALL]',
        });
        const retryState = model(transformedDocumentsBulkIndexState, errorRes);
        expect(retryState.controlState).toEqual('TRANSFORMED_DOCUMENTS_BULK_INDEX');
        expect(retryState.retryCount).toEqual(1);

        // Second call: success after shards become available, last batch
        const successRes: ResponseType<'TRANSFORMED_DOCUMENTS_BULK_INDEX'> =
          Either.right('bulk_index_succeeded');
        const recoveredState = model(
          { ...(retryState as State), currentBatch: 1 } as State,
          successRes
        );
        expect(recoveredState.controlState).toEqual('OUTDATED_DOCUMENTS_SEARCH_READ');
        expect(recoveredState.retryCount).toEqual(0);
        expect(recoveredState.retryDelay).toEqual(0);
      });
    });

    describe('UPDATE_TARGET_MAPPINGS_PROPERTIES', () => {
      const updateTargetMappingsState: UpdateTargetMappingsPropertiesState = {
        ...postInitState,
        controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        updatedTypesQuery: Option.fromNullable({
          bool: {
            should: [
              {
                term: {
                  type: 'type1',
                },
              },
            ],
          },
        }),
      };

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES'> = Either.right({
          taskId: 'update target mappings task',
        });
        const newState = model(
          updateTargetMappingsState,
          res
        ) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK');
        expect(newState.updateTargetMappingsTaskId).toEqual('update target mappings task');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
        // make sure the updated types query is still in the new state since
        // we might want to come back if the wait for task state fails
        expect(newState.updatedTypesQuery).toEqual(updateTargetMappingsState.updatedTypesQuery);
      });
    });

    describe('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK', () => {
      const updateTargetMappingsWaitForTaskState: UpdateTargetMappingsPropertiesWaitForTaskState = {
        ...postInitState,
        controlState: 'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
        updateTargetMappingsTaskId: 'update target mappings task',
        updatedTypesQuery: Option.fromNullable({
          bool: {
            should: [
              {
                term: {
                  type: 'type123',
                },
              },
            ],
          },
        }),
      };

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_META if response is right', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.right(
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

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK when response is left wait_for_task_completion_timeout', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(updateTargetMappingsWaitForTaskState, res);
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(1);
        expect(newState.retryDelay).toEqual(2000);
      });

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK with incremented retry count when response is left wait_for_task_completion_timeout a second time', () => {
        const state = Object.assign({}, updateTargetMappingsWaitForTaskState, { retryCount: 1 });
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: '[timeout_exception] Timeout waiting for ...',
          type: 'wait_for_task_completion_timeout',
        });
        const newState = model(state, res);
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK');
        expect(newState.retryCount).toEqual(2);
        expect(newState.retryDelay).toEqual(4000);
      });

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES when there is an error that makes us want to retry the original task', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: 'Some error happened that makes us want to retry the original task',
          type: 'task_completed_with_retriable_error',
        });
        const newState = model(
          updateTargetMappingsWaitForTaskState,
          res
        ) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_PROPERTIES');
        expect(newState.retryCount).toEqual(1);
        expect(newState.updatedTypesQuery).toEqual(
          updateTargetMappingsWaitForTaskState.updatedTypesQuery
        );
      });

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES updates correcly the retry number', () => {
        const state = Object.assign({}, updateTargetMappingsWaitForTaskState, { retryCount: 3 });
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: 'Some error happened that makes us want to retry the original task',
          type: 'task_completed_with_retriable_error',
        });
        const newState = model(state, res) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(newState.controlState).toEqual('UPDATE_TARGET_MAPPINGS_PROPERTIES');
        expect(newState.retryCount).toEqual(4);
        expect(newState.updatedTypesQuery).toEqual(
          updateTargetMappingsWaitForTaskState.updatedTypesQuery
        );
      });

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK updates retry attributes correctly', () => {
        const initialRetryCount = 3;

        // First, we are in UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK
        const initialWaitState = Object.assign({}, updateTargetMappingsWaitForTaskState, {
          retryCount: initialRetryCount,
        });
        expect(initialWaitState.retryCount).toBe(initialRetryCount);
        expect(initialWaitState.skipRetryReset).toBeFalsy();

        // Move to UPDATE_TARGET_MAPPINGS_PROPERTIES and retry it (+1 retry)
        const retryingMappingsUpdate = model(
          initialWaitState,
          Either.left({
            message: 'Some error happened that makes us want to retry the original task',
            type: 'task_completed_with_retriable_error',
          } as TaskCompletedWithRetriableError)
        ) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(retryingMappingsUpdate.retryCount).toBe(initialRetryCount + 1);
        expect(retryingMappingsUpdate.skipRetryReset).toBe(true);

        // Retry UPDATE_TARGET_MAPPINGS_PROPERTIES again (+1 retry)
        const retryingMappingsUpdateAgain = model(
          retryingMappingsUpdate,
          Either.left({
            type: 'retryable_es_client_error',
            message: 'random retryable error',
          } as RetryableEsClientError)
        ) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(retryingMappingsUpdateAgain.retryCount).toBe(initialRetryCount + 2);
        expect(retryingMappingsUpdateAgain.skipRetryReset).toBe(true);

        // Go again to the wait state, so retryCount should remain the same
        const finalWaitStateBeforeCompletion = model(
          retryingMappingsUpdateAgain,
          Either.right({
            taskId: 'update target mappings task',
          }) as ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES'>
        ) as UpdateTargetMappingsPropertiesWaitForTaskState;
        expect(finalWaitStateBeforeCompletion.retryCount).toBe(initialRetryCount + 2);
        expect(finalWaitStateBeforeCompletion.skipRetryReset).toBeFalsy();

        // The wait state completes successfully, so retryCount should reset
        const postUpdateState = model(
          finalWaitStateBeforeCompletion,
          Either.right(
            'pickup_updated_mappings_succeeded'
          ) as ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'>
        ) as UpdateTargetMappingsMeta;
        expect(postUpdateState.retryCount).toBe(0);
        expect(postUpdateState.skipRetryReset).toBeFalsy();
      });

      test('UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK -> FATAL if task_completed_with_retriable_error has no more retry attemps', () => {
        const state = Object.assign({}, updateTargetMappingsWaitForTaskState, {
          retryCount: 8,
          retryAttempts: 8,
        });
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK'> = Either.left({
          message: 'some_retryable_error_during_update',
          type: 'task_completed_with_retriable_error',
        });
        const newState = model(state, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"Unable to complete the UPDATE_TARGET_MAPPINGS_PROPERTIES step after 8 attempts, terminating. The last failure message was: some_retryable_error_during_update"`
        );
      });
    });

    describe('UPDATE_TARGET_MAPPINGS_META', () => {
      const updateTargetMappingsMetaState: UpdateTargetMappingsMeta = {
        ...postInitState,
        controlState: 'UPDATE_TARGET_MAPPINGS_META',
        versionIndexReadyActions: Option.none,
        sourceIndex: Option.some('.kibana') as Option.Some<string>,
        targetIndex: '.kibana_7.11.0_001',
      };

      test('UPDATE_TARGET_MAPPINGS_META -> CHECK_VERSION_INDEX_READY_ACTIONS if the mapping _meta information is successfully updated', () => {
        const res: ResponseType<'UPDATE_TARGET_MAPPINGS_META'> = Either.right(
          'update_mappings_succeeded'
        );
        const newState = model(updateTargetMappingsMetaState, res) as CheckVersionIndexReadyActions;
        expect(newState.controlState).toBe('CHECK_VERSION_INDEX_READY_ACTIONS');
      });
    });

    describe('CHECK_VERSION_INDEX_READY_ACTIONS', () => {
      const res: ResponseType<'CHECK_VERSION_INDEX_READY_ACTIONS'> = Either.right('noop');

      const сheckVersionIndexReadyActionsState: CheckVersionIndexReadyActions = {
        ...postInitState,
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
            ...сheckVersionIndexReadyActionsState,
            versionIndexReadyActions,
          },
          res
        );
        expect(newState.controlState).toEqual('MARK_VERSION_INDEX_READY');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('CHECK_VERSION_INDEX_READY_ACTIONS -> DONE if none versionIndexReadyActions', () => {
        const newState = model(сheckVersionIndexReadyActionsState, res);
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
        ...postInitState,
        controlState: 'CREATE_NEW_TARGET',
        versionIndexReadyActions: aliasActions,
        sourceIndex: Option.none as Option.None,
        targetIndex: '.kibana_7.11.0_001',
      };

      test('CREATE_NEW_TARGET -> CHECK_VERSION_INDEX_READY_ACTIONS', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.right('create_index_succeeded');
        const newState = model(createNewTargetState, res);
        expect(newState.controlState).toEqual('CHECK_VERSION_INDEX_READY_ACTIONS');
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

      test('CREATE_NEW_TARGET -> CHECK_VERSION_INDEX_READY_ACTIONS resets the retry count and delay', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.right('create_index_succeeded');
        const testState = {
          ...createNewTargetState,
          retryCount: 1,
          retryDelay: 2000,
        };

        const newState = model(testState, res);
        expect(newState.controlState).toEqual('CHECK_VERSION_INDEX_READY_ACTIONS');
        expect(newState.retryCount).toEqual(0);
        expect(newState.retryDelay).toEqual(0);
      });

      test('CREATE_NEW_TARGET -> FATAL if action fails with cluster_shard_limit_exceeded', () => {
        const res: ResponseType<'CREATE_NEW_TARGET'> = Either.left({
          type: 'cluster_shard_limit_exceeded',
        });
        const newState = model(createNewTargetState, res) as FatalState;
        expect(newState.controlState).toEqual('FATAL');
        expect(newState.reason).toMatchInlineSnapshot(
          `"[cluster_shard_limit_exceeded] Upgrading Kibana requires adding a small number of new shards. Ensure that Kibana is able to add 10 more shards by increasing the cluster.max_shards_per_node setting, or removing indices to clear up resources. See clusterShardLimitExceeded"`
        );
      });
    });

    describe('MARK_VERSION_INDEX_READY', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const markVersionIndexReadyState: MarkVersionIndexReady = {
        ...postInitState,
        controlState: 'MARK_VERSION_INDEX_READY',
        versionIndexReadyActions: aliasActions,
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

    });

    describe('MARK_VERSION_INDEX_READY_CONFLICT', () => {
      const aliasActions = Option.some([Symbol('alias action')] as unknown) as Option.Some<
        AliasAction[]
      >;
      const markVersionIndexConflictState: MarkVersionIndexReadyConflict = {
        ...postInitState,
        controlState: 'MARK_VERSION_INDEX_READY_CONFLICT',
        versionIndexReadyActions: aliasActions,
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
