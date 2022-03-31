/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '../../../../';
import * as kbnTestServer from '../../../../../test_helpers/kbn_server';
import { SavedObjectsRawDoc } from '../../../serialization';
import {
  bulkOverwriteTransformedDocuments,
  cloneIndex,
  closePit,
  createIndex,
  fetchIndices,
  openPit,
  OpenPitResponse,
  reindex,
  readWithPit,
  ReadWithPit,
  searchForOutdatedDocuments,
  SearchResponse,
  setWriteBlock,
  updateAliases,
  waitForReindexTask,
  ReindexResponse,
  waitForPickupUpdatedMappingsTask,
  pickupUpdatedMappings,
  UpdateByQueryResponse,
  updateAndPickupMappings,
  UpdateAndPickupMappingsResponse,
  verifyReindex,
  removeWriteBlock,
  transformDocs,
  waitForIndexStatusYellow,
} from '../../actions';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { DocumentsTransformFailed, DocumentsTransformSuccess } from '../../../migrations/core';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import Path from 'path';

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
      dataArchive: Path.join(
        __dirname,
        '../../integration_tests/archives',
        '7.7.2_xpack_100k_obj.zip'
      ),
      esArgs: ['http.max_content_length=10Kb'],
    },
  },
});
let esServer: kbnTestServer.TestElasticsearchUtils;

describe('migration actions', () => {
  let client: ElasticsearchClient;

  beforeAll(async () => {
    esServer = await startES();
    client = esServer.es.getClient();

    // Create test fixture data:
    await createIndex({
      client,
      indexName: 'existing_index_with_docs',
      mappings: {
        dynamic: true,
        properties: {},
      },
    })();
    const sourceDocs = [
      { _source: { title: 'doc 1' } },
      { _source: { title: 'doc 2' } },
      { _source: { title: 'doc 3' } },
      { _source: { title: 'saved object 4', type: 'another_unused_type' } },
      { _source: { title: 'f-agent-event 5', type: 'f_agent_event' } },
    ] as unknown as SavedObjectsRawDoc[];
    await bulkOverwriteTransformedDocuments({
      client,
      index: 'existing_index_with_docs',
      transformedDocs: sourceDocs,
      refresh: 'wait_for',
    })();

    await createIndex({ client, indexName: 'existing_index_2', mappings: { properties: {} } })();
    await createIndex({
      client,
      indexName: 'existing_index_with_write_block',
      mappings: { properties: {} },
    })();
    await bulkOverwriteTransformedDocuments({
      client,
      index: 'existing_index_with_write_block',
      transformedDocs: sourceDocs,
      refresh: 'wait_for',
    })();
    await setWriteBlock({ client, index: 'existing_index_with_write_block' })();
    await updateAliases({
      client,
      aliasActions: [{ add: { index: 'existing_index_2', alias: 'existing_index_2_alias' } }],
    })();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  describe('fetchIndices', () => {
    it('resolves right empty record if no indices were found', async () => {
      expect.assertions(1);
      const task = fetchIndices({ client, indices: ['no_such_index'] });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": Object {},
                }
              `);
    });
    it('resolves right record with found indices', async () => {
      expect.assertions(1);
      const res = (await fetchIndices({
        client,
        indices: ['no_such_index', 'existing_index_with_docs'],
      })()) as Either.Right<unknown>;

      expect(res.right).toEqual(
        expect.objectContaining({
          existing_index_with_docs: {
            aliases: {},
            mappings: expect.anything(),
            settings: expect.anything(),
          },
        })
      );
    });
  });

  describe('setWriteBlock', () => {
    beforeAll(async () => {
      await createIndex({
        client,
        indexName: 'new_index_without_write_block',
        mappings: { properties: {} },
      })();
    });
    it('resolves right when setting the write block succeeds', async () => {
      expect.assertions(1);
      const task = setWriteBlock({ client, index: 'new_index_without_write_block' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "set_write_block_succeeded",
                }
              `);
    });
    it('resolves right when setting a write block on an index that already has one', async () => {
      expect.assertions(1);
      const task = setWriteBlock({ client, index: 'existing_index_with_write_block' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "set_write_block_succeeded",
                }
              `);
    });
    it('once resolved, prevents further writes to the index', async () => {
      expect.assertions(1);
      const task = setWriteBlock({ client, index: 'new_index_without_write_block' });
      await task();
      const sourceDocs = [
        { _source: { title: 'doc 1' } },
        { _source: { title: 'doc 2' } },
        { _source: { title: 'doc 3' } },
        { _source: { title: 'doc 4' } },
      ] as unknown as SavedObjectsRawDoc[];

      const res = (await bulkOverwriteTransformedDocuments({
        client,
        index: 'new_index_without_write_block',
        transformedDocs: sourceDocs,
        refresh: 'wait_for',
      })()) as Either.Left<unknown>;

      expect(res.left).toEqual({
        type: 'target_index_had_write_block',
      });
    });
    it('resolves left index_not_found_exception when the index does not exist', async () => {
      expect.assertions(1);
      const task = setWriteBlock({ client, index: 'no_such_index' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "index": "no_such_index",
                    "type": "index_not_found_exception",
                  },
                }
              `);
    });
  });

  describe('removeWriteBlock', () => {
    beforeAll(async () => {
      await createIndex({
        client,
        indexName: 'existing_index_without_write_block_2',
        mappings: { properties: {} },
      })();
      await createIndex({
        client,
        indexName: 'existing_index_with_write_block_2',
        mappings: { properties: {} },
      })();
      await setWriteBlock({ client, index: 'existing_index_with_write_block_2' })();
    });
    it('resolves right if successful when an index already has a write block', async () => {
      expect.assertions(1);
      const task = removeWriteBlock({ client, index: 'existing_index_with_write_block_2' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "remove_write_block_succeeded",
                }
              `);
    });
    it('resolves right if successful when an index does not have a write block', async () => {
      expect.assertions(1);
      const task = removeWriteBlock({ client, index: 'existing_index_without_write_block_2' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "remove_write_block_succeeded",
                }
              `);
    });
    it('rejects if there is a non-retryable error', async () => {
      expect.assertions(1);
      const task = removeWriteBlock({ client, index: 'no_such_index' });
      await expect(task()).rejects.toThrow('index_not_found_exception');
    });
  });

  describe('waitForIndexStatusYellow', () => {
    afterAll(async () => {
      await client.indices.delete({ index: 'red_then_yellow_index' });
    });
    it('resolves right after waiting for an index status to be yellow if the index already existed', async () => {
      // Create a red index
      await client.indices.create(
        {
          index: 'red_then_yellow_index',
          timeout: '5s',
          body: {
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
              // Disable all shard allocation so that the index status is red
              routing: { allocation: { enable: 'none' } },
            },
          },
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      );

      // Start tracking the index status
      const indexStatusPromise = waitForIndexStatusYellow({
        client,
        index: 'red_then_yellow_index',
      })();

      const redStatusResponse = await client.cluster.health({ index: 'red_then_yellow_index' });
      expect(redStatusResponse.body.status).toBe('red');

      client.indices.putSettings({
        index: 'red_then_yellow_index',
        body: {
          // Enable all shard allocation so that the index status turns yellow
          settings: { routing: { allocation: { enable: 'all' } } },
        },
      });

      await indexStatusPromise;
      // Assert that the promise didn't resolve before the index became yellow

      const yellowStatusResponse = await client.cluster.health({ index: 'red_then_yellow_index' });
      expect(yellowStatusResponse.body.status).toBe('yellow');
    });
  });

  describe('cloneIndex', () => {
    afterAll(async () => {
      try {
        await client.indices.delete({ index: 'clone_*' });
      } catch (e) {
        /** ignore */
      }
    });
    it('resolves right if cloning into a new target index', async () => {
      const task = cloneIndex({
        client,
        source: 'existing_index_with_write_block',
        target: 'clone_target_1',
      });
      expect.assertions(1);
      await expect(task()).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Right",
            "right": Object {
              "acknowledged": true,
              "shardsAcknowledged": true,
            },
          }
      `);
    });
    it('resolves right after waiting for index status to be yellow if clone target already existed', async () => {
      expect.assertions(2);

      // Create a yellow index
      await client.indices
        .create({
          index: 'clone_red_then_yellow_index',
          timeout: '5s',
          body: {
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
              // Disable all shard allocation so that the index status is red
              'index.routing.allocation.enable': 'none',
            },
          },
        })
        .catch((e) => {});

      // Call clone even though the index already exists
      const cloneIndexPromise = cloneIndex({
        client,
        source: 'existing_index_with_write_block',
        target: 'clone_red_then_yellow_index',
      })();

      let indexYellow = false;
      setTimeout(() => {
        client.indices.putSettings({
          index: 'clone_red_then_yellow_index',
          body: {
            // Enable all shard allocation so that the index status goes yellow
            settings: { routing: { allocation: { enable: 'all' } } },
          },
        });
        indexYellow = true;
      }, 10);

      await cloneIndexPromise.then((res) => {
        // Assert that the promise didn't resolve before the index became green
        expect(indexYellow).toBe(true);
        expect(res).toMatchInlineSnapshot(`
          Object {
            "_tag": "Right",
            "right": Object {
              "acknowledged": true,
              "shardsAcknowledged": true,
            },
          }
        `);
      });
    });
    it('resolves left index_not_found_exception if the source index does not exist', async () => {
      expect.assertions(1);
      const task = cloneIndex({ client, source: 'no_such_index', target: 'clone_target_3' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Left",
                        "left": Object {
                          "index": "no_such_index",
                          "type": "index_not_found_exception",
                        },
                      }
                  `);
    });
    it('resolves left with a retryable_es_client_error if clone target already exists but takes longer than the specified timeout before turning yellow', async () => {
      // Create a red index
      await client.indices
        .create({
          index: 'clone_red_index',
          timeout: '5s',
          body: {
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
              // Disable all shard allocation so that the index status is red
              'index.routing.allocation.enable': 'none',
            },
          },
        })
        .catch((e) => {});

      // Call clone even though the index already exists
      const cloneIndexPromise = cloneIndex({
        client,
        source: 'existing_index_with_write_block',
        target: 'clone_red_index',
        timeout: '0s',
      })();

      await expect(cloneIndexPromise).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "message": "Timeout waiting for the status of the [clone_red_index] index to become 'yellow'",
            "type": "retryable_es_client_error",
          },
        }
      `);
    });
  });

  // Reindex doesn't return any errors on it's own, so we have to test
  // together with waitForReindexTask
  describe('reindex & waitForReindexTask', () => {
    it('resolves right when reindex succeeds without reindex script', async () => {
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "reindex_succeeded",
                }
              `);

      const results = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'reindex_target',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title).sort()).toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3",
          "f-agent-event 5",
          "saved object 4",
        ]
      `);
    });
    it('resolves right and excludes all documents not matching the unusedTypesQuery', async () => {
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_excluded_docs',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: {
          bool: {
            must_not: ['f_agent_event', 'another_unused_type'].map((type) => ({
              term: { type },
            })),
          },
        },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Right",
                        "right": "reindex_succeeded",
                      }
                  `);

      const results = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'reindex_target_excluded_docs',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title).sort()).toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3",
        ]
      `);
    });
    it('resolves right when reindex succeeds with reindex script', async () => {
      expect.assertions(2);
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_2',
        reindexScript: Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "reindex_succeeded",
                }
              `);
      const results = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'reindex_target_2',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title).sort()).toMatchInlineSnapshot(`
        Array [
          "doc 1_updated",
          "doc 2_updated",
          "doc 3_updated",
          "f-agent-event 5_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves right, ignores version conflicts and does not update existing docs when reindex multiple times', async () => {
      expect.assertions(3);
      // Reindex with a script
      let res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_3',
        reindexScript: Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      let task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Right",
                        "right": "reindex_succeeded",
                      }
                  `);

      // reindex without a script
      res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_3',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Right",
                        "right": "reindex_succeeded",
                      }
                  `);

      // Assert that documents weren't overridden by the second, unscripted reindex
      const results = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'reindex_target_3',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title).sort()).toMatchInlineSnapshot(`
        Array [
          "doc 1_updated",
          "doc 2_updated",
          "doc 3_updated",
          "f-agent-event 5_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves right and proceeds to add missing documents if there are some existing docs conflicts', async () => {
      expect.assertions(2);
      // Simulate a reindex that only adds some of the documents from the
      // source index into the target index
      await createIndex({ client, indexName: 'reindex_target_4', mappings: { properties: {} } })();
      const sourceDocs = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'existing_index_with_docs',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments
        .slice(0, 2)
        .map(({ _id, _source }) => ({
          _id,
          _source,
        }));
      await bulkOverwriteTransformedDocuments({
        client,
        index: 'reindex_target_4',
        transformedDocs: sourceDocs,
        refresh: 'wait_for',
      })();

      // Now do a real reindex
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_4',
        reindexScript: Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                        Object {
                          "_tag": "Right",
                          "right": "reindex_succeeded",
                        }
                  `);
      // Assert that existing documents weren't overridden, but that missing
      // documents were added by the reindex
      const results = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'reindex_target_4',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title).sort()).toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3_updated",
          "f-agent-event 5_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves left incompatible_mapping_exception if all reindex failures are due to a strict_dynamic_mapping_exception', async () => {
      expect.assertions(1);
      // Simulates one instance having completed the UPDATE_TARGET_MAPPINGS
      // step which makes the mappings incompatible with outdated documents.
      // If another instance then tries a reindex it will get a
      // strict_dynamic_mapping_exception even if the documents already exist
      // and should ignore this error.

      // Create an index with incompatible mappings
      await createIndex({
        client,
        indexName: 'reindex_target_5',
        mappings: {
          dynamic: 'strict',
          properties: {
            /** no title field */
          },
        },
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_5',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: reindexTaskId, timeout: '10s' });

      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Left",
                        "left": Object {
                          "type": "incompatible_mapping_exception",
                        },
                      }
                  `);
    });
    it('resolves left incompatible_mapping_exception if all reindex failures are due to a mapper_parsing_exception', async () => {
      expect.assertions(1);
      // Simulates one instance having completed the UPDATE_TARGET_MAPPINGS
      // step which makes the mappings incompatible with outdated documents.
      // If another instance then tries a reindex it will get a
      // strict_dynamic_mapping_exception even if the documents already exist
      // and should ignore this error.

      // Create an index with incompatible mappings
      await createIndex({
        client,
        indexName: 'reindex_target_6',
        mappings: {
          dynamic: false,
          properties: { title: { type: 'integer' } }, // integer is incompatible with string title
        },
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_6',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: reindexTaskId, timeout: '10s' });

      await expect(task()).resolves.toMatchInlineSnapshot(`
                        Object {
                          "_tag": "Left",
                          "left": Object {
                            "type": "incompatible_mapping_exception",
                          },
                        }
                  `);
    });
    it('resolves left index_not_found_exception if source index does not exist', async () => {
      expect.assertions(1);
      const res = (await reindex({
        client,
        sourceIndex: 'no_such_index',
        targetIndex: 'reindex_target',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: {
          match_all: {},
        },
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                            Object {
                              "_tag": "Left",
                              "left": Object {
                                "index": "no_such_index",
                                "type": "index_not_found_exception",
                              },
                            }
                    `);
    });
    it('resolves left target_index_had_write_block if all failures are due to a write block', async () => {
      expect.assertions(1);
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'existing_index_with_write_block',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });

      await expect(task()).resolves.toMatchInlineSnapshot(`
                          Object {
                            "_tag": "Left",
                            "left": Object {
                              "type": "target_index_had_write_block",
                            },
                          }
                    `);
    });
    it('resolves left if requireAlias=true and the target is not an alias', async () => {
      expect.assertions(1);
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'existing_index_with_write_block',
        reindexScript: Option.none,
        requireAlias: true,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });

      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "index": "existing_index_with_write_block",
                    "type": "index_not_found_exception",
                  },
                }
              `);
    });

    // Failing 7.latest ES 8.2 forward compatibility: https://github.com/elastic/kibana/issues/129078
    it.skip('resolves left wait_for_task_completion_timeout when the task does not finish within the timeout', async () => {
      await waitForIndexStatusYellow({
        client,
        index: '.kibana_1',
      })();

      const res = (await reindex({
        client,
        sourceIndex: '.kibana_1',
        targetIndex: 'reindex_target',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '0s' });

      await expect(task()).resolves.toMatchObject({
        _tag: 'Left',
        left: {
          error: expect.any(ResponseError),
          message: expect.stringMatching(
            /\[timeout_exception\] Timed out waiting for completion of \[org.elasticsearch.index.reindex.BulkByScrollTask/
          ),
          type: 'wait_for_task_completion_timeout',
        },
      });
    });
  });

  describe('verifyReindex', () => {
    it('resolves right if source and target indices have the same amount of documents', async () => {
      expect.assertions(1);
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_7',
        reindexScript: Option.none,
        requireAlias: false,
        unusedTypesQuery: { match_all: {} },
      })()) as Either.Right<ReindexResponse>;
      await waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' })();

      const task = verifyReindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_7',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
              Object {
                "_tag": "Right",
                "right": "verify_reindex_succeeded",
              }
            `);
    });
    it('resolves left if source and target indices have different amount of documents', async () => {
      expect.assertions(1);
      const task = verifyReindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'existing_index_2',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "type": "verify_reindex_failed",
                  },
                }
              `);
    });
    it('rejects if source or target index does not exist', async () => {
      expect.assertions(2);
      let task = verifyReindex({
        client,
        sourceIndex: 'no_such_index',
        targetIndex: 'existing_index_2',
      });
      await expect(task()).rejects.toThrow('index_not_found_exception');

      task = verifyReindex({
        client,
        sourceIndex: 'existing_index_2',
        targetIndex: 'no_such_index',
      });
      await expect(task()).rejects.toThrow('index_not_found_exception');
    });
  });

  describe('openPit', () => {
    it('opens PointInTime for an index', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      expect(pitResponse.right.pitId).toEqual(expect.any(String));

      const searchResponse = await client.search({
        body: {
          pit: { id: pitResponse.right.pitId },
        },
      });

      await expect(searchResponse.body.hits.hits.length).toBeGreaterThan(0);
    });
    it('rejects if index does not exist', async () => {
      const openPitTask = openPit({ client, index: 'no_such_index' });
      await expect(openPitTask()).rejects.toThrow('index_not_found_exception');
    });
  });

  describe('readWithPit', () => {
    it('requests documents from an index using given PIT', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: { match_all: {} },
        batchSize: 1000,
        searchAfter: undefined,
      });
      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      await expect(docsResponse.right.outdatedDocuments.length).toBe(5);
    });

    it('requests the batchSize of documents from an index', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: { match_all: {} },
        batchSize: 3,
        searchAfter: undefined,
      });
      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      await expect(docsResponse.right.outdatedDocuments.length).toBe(3);
    });

    it('it excludes documents not matching the provided "query"', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: {
          bool: {
            must_not: [
              {
                term: {
                  type: 'f_agent_event',
                },
              },
              {
                term: {
                  type: 'another_unused_type',
                },
              },
            ],
          },
        },
        batchSize: 1000,
        searchAfter: undefined,
      });

      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      expect(docsResponse.right.outdatedDocuments.map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3",
        ]
      `);
    });

    it('only returns documents that match the provided "query"', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: {
          match: { title: { query: 'doc' } },
        },
        batchSize: 1000,
        searchAfter: undefined,
      });

      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      expect(docsResponse.right.outdatedDocuments.map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3",
        ]
      `);
    });

    it('returns docs with _seq_no and _primary_term when specified', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: {
          match: { title: { query: 'doc' } },
        },
        batchSize: 1000,
        searchAfter: undefined,
        seqNoPrimaryTerm: true,
      });

      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      expect(docsResponse.right.outdatedDocuments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _seq_no: expect.any(Number),
            _primary_term: expect.any(Number),
          }),
        ])
      );
    });

    it('does not return docs with _seq_no and _primary_term if not specified', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: {
          match: { title: { query: 'doc' } },
        },
        batchSize: 1000,
        searchAfter: undefined,
      });

      const docsResponse = (await readWithPitTask()) as Either.Right<ReadWithPit>;

      expect(docsResponse.right.outdatedDocuments).toEqual(
        expect.arrayContaining([
          expect.not.objectContaining({
            _seq_no: expect.any(Number),
            _primary_term: expect.any(Number),
          }),
        ])
      );
    });

    it('rejects if PIT does not exist', async () => {
      const readWithPitTask = readWithPit({
        client,
        pitId: 'no_such_pit',
        query: { match_all: {} },
        batchSize: 1000,
        searchAfter: undefined,
      });
      await expect(readWithPitTask()).rejects.toThrow('illegal_argument_exception');
    });
  });

  describe('closePit', () => {
    it('closes PointInTime', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const pitId = pitResponse.right.pitId;
      await closePit({ client, pitId })();

      const searchTask = client.search({
        body: {
          pit: { id: pitId },
        },
      });

      await expect(searchTask).rejects.toThrow('search_phase_execution_exception');
    });

    it('rejects if PIT does not exist', async () => {
      const closePitTask = closePit({ client, pitId: 'no_such_pit' });
      await expect(closePitTask()).rejects.toThrow('illegal_argument_exception');
    });
  });

  describe('transformDocs', () => {
    it('applies "transformRawDocs" and returns the transformed documents', async () => {
      const originalDocs = [
        { _id: 'foo:1', _source: { type: 'dashboard', value: 1 } },
        { _id: 'foo:2', _source: { type: 'dashboard', value: 2 } },
      ];

      function innerTransformRawDocs(
        docs: SavedObjectsRawDoc[]
      ): TaskEither<DocumentsTransformFailed, DocumentsTransformSuccess> {
        return async () => {
          const processedDocs: SavedObjectsRawDoc[] = [];
          for (const doc of docs) {
            doc._source.value += 1;
            processedDocs.push(doc);
          }
          return Either.right({ processedDocs });
        };
      }

      const transformTask = transformDocs({
        transformRawDocs: innerTransformRawDocs,
        outdatedDocuments: originalDocs,
      });

      const resultsWithProcessDocs = (
        (await transformTask()) as Either.Right<DocumentsTransformSuccess>
      ).right.processedDocs;
      expect(resultsWithProcessDocs.length).toEqual(2);
      const foo2 = resultsWithProcessDocs.find((h) => h._id === 'foo:2');
      expect(foo2?._source?.value).toBe(3);
    });
  });

  describe('waitForPickupUpdatedMappingsTask', () => {
    it('rejects if there are failures', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_write_block'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask({
        client,
        taskId: res.right.taskId,
        timeout: '10s',
      });

      // We can't do a snapshot match because the response includes an index
      // id which ES assigns dynamically
      await expect(task()).rejects.toMatchObject({
        message:
          /pickupUpdatedMappings task failed with the following failures:\n\[\{\"index\":\"existing_index_with_write_block\"/,
      });
    });
    it('rejects if there is an error', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'no_such_index'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask({
        client,
        taskId: res.right.taskId,
        timeout: '10s',
      });

      await expect(task()).rejects.toThrow('index_not_found_exception');
    });
    it('resolves left wait_for_task_completion_timeout when the task does not complete within the timeout', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        '.kibana_1'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask({
        client,
        taskId: res.right.taskId,
        timeout: '0s',
      });

      await expect(task()).resolves.toMatchObject({
        _tag: 'Left',
        left: {
          error: expect.any(ResponseError),
          message: expect.stringMatching(
            /\[timeout_exception\] Timed out waiting for completion of \[org.elasticsearch.index.reindex.BulkByScrollTask/
          ),
          type: 'wait_for_task_completion_timeout',
        },
      });
    });
    it('resolves right when successful', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_docs'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask({
        client,
        taskId: res.right.taskId,
        timeout: '10s',
      });

      await expect(task()).resolves.toMatchInlineSnapshot(`
                        Object {
                          "_tag": "Right",
                          "right": "pickup_updated_mappings_succeeded",
                        }
                    `);
    });
  });

  describe('updateAndPickupMappings', () => {
    it('resolves right when mappings were updated and picked up', async () => {
      // Create an index without any mappings and insert documents into it
      await createIndex({
        client,
        indexName: 'existing_index_without_mappings',
        mappings: {
          dynamic: false,
          properties: {},
        },
      })();
      const sourceDocs = [
        { _source: { title: 'doc 1' } },
        { _source: { title: 'doc 2' } },
        { _source: { title: 'doc 3' } },
        { _source: { title: 'doc 4' } },
      ] as unknown as SavedObjectsRawDoc[];
      await bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_without_mappings',
        transformedDocs: sourceDocs,
        refresh: 'wait_for',
      })();

      // Assert that we can't search over the unmapped fields of the document
      const originalSearchResults = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'existing_index_without_mappings',
          outdatedDocumentsQuery: {
            match: { title: { query: 'doc' } },
          },
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(originalSearchResults.length).toBe(0);

      // Update and pickup mappings so that the title field is searchable
      const res = await updateAndPickupMappings({
        client,
        index: 'existing_index_without_mappings',
        mappings: {
          properties: {
            title: { type: 'text' },
          },
        },
      })();
      expect(Either.isRight(res)).toBe(true);
      const taskId = (res as Either.Right<UpdateAndPickupMappingsResponse>).right.taskId;
      await waitForPickupUpdatedMappingsTask({ client, taskId, timeout: '60s' })();

      // Repeat the search expecting to be able to find the existing documents
      const pickedUpSearchResults = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'existing_index_without_mappings',
          outdatedDocumentsQuery: {
            match: { title: { query: 'doc' } },
          },
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;
      expect(pickedUpSearchResults.length).toBe(4);
    });
  });

  describe('updateAliases', () => {
    describe('remove', () => {
      it('resolves left index_not_found_exception when the index does not exist', async () => {
        const task = updateAliases({
          client,
          aliasActions: [
            {
              remove: {
                alias: 'no_such_alias',
                index: 'no_such_index',
                must_exist: false,
              },
            },
          ],
        });
        await expect(task()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "_tag": "Left",
                    "left": Object {
                      "index": "no_such_index",
                      "type": "index_not_found_exception",
                    },
                  }
                `);
      });
      describe('with must_exist=false', () => {
        it('resolves left alias_not_found_exception when alias does not exist', async () => {
          const task = updateAliases({
            client,
            aliasActions: [
              {
                remove: {
                  alias: 'no_such_alias',
                  index: 'existing_index_with_docs',
                  must_exist: false,
                },
              },
            ],
          });
          await expect(task()).resolves.toMatchInlineSnapshot(`
                    Object {
                      "_tag": "Left",
                      "left": Object {
                        "type": "alias_not_found_exception",
                      },
                    }
                  `);
        });
      });
      describe('with must_exist=true', () => {
        it('resolves left alias_not_found_exception when alias does not exist on specified index', async () => {
          const task = updateAliases({
            client,
            aliasActions: [
              {
                remove: {
                  alias: 'existing_index_2_alias',
                  index: 'existing_index_with_docs',
                  must_exist: true,
                },
              },
            ],
          });
          await expect(task()).resolves.toMatchInlineSnapshot(`
                    Object {
                      "_tag": "Left",
                      "left": Object {
                        "type": "alias_not_found_exception",
                      },
                    }
                  `);
        });
        it('resolves left alias_not_found_exception when alias does not exist', async () => {
          const task = updateAliases({
            client,
            aliasActions: [
              {
                remove: {
                  alias: 'no_such_alias',
                  index: 'existing_index_with_docs',
                  must_exist: true,
                },
              },
            ],
          });
          await expect(task()).resolves.toMatchInlineSnapshot(`
                    Object {
                      "_tag": "Left",
                      "left": Object {
                        "type": "alias_not_found_exception",
                      },
                    }
                  `);
        });
      });
    });
    describe('remove_index', () => {
      it('left index_not_found_exception if index does not exist', async () => {
        const task = updateAliases({
          client,
          aliasActions: [
            {
              remove_index: {
                index: 'no_such_index',
              },
            },
          ],
        });
        await expect(task()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "_tag": "Left",
                    "left": Object {
                      "index": "no_such_index",
                      "type": "index_not_found_exception",
                    },
                  }
                `);
      });
      it('left remove_index_not_a_concrete_index when remove_index targets an alias', async () => {
        const task = updateAliases({
          client,
          aliasActions: [
            {
              remove_index: {
                index: 'existing_index_2_alias',
              },
            },
          ],
        });
        await expect(task()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "_tag": "Left",
                    "left": Object {
                      "type": "remove_index_not_a_concrete_index",
                    },
                  }
                `);
      });
    });
  });

  describe('createIndex', () => {
    afterAll(async () => {
      await client.indices.delete({ index: 'red_then_yellow_index' });
    });
    it('resolves right after waiting for an index status to be yellow if the index already existed', async () => {
      expect.assertions(2);
      // Create a red index
      await client.indices
        .create(
          {
            index: 'red_then_yellow_index',
            timeout: '5s',
            body: {
              mappings: { properties: {} },
              settings: {
                // Allocate 1 replica so that this index stays yellow
                number_of_replicas: '1',
                // Disable all shard allocation so that the index status is red
                'index.routing.allocation.enable': 'none',
              },
            },
          },
          { maxRetries: 0 /** handle retry ourselves for now */ }
        )
        .catch((e) => {
          /** ignore */
        });

      // Call createIndex even though the index already exists
      const createIndexPromise = createIndex({
        client,
        indexName: 'red_then_yellow_index',
        mappings: undefined as any,
      })();
      let indexYellow = false;

      setTimeout(() => {
        client.indices.putSettings({
          index: 'red_then_yellow_index',
          body: {
            // Disable all shard allocation so that the index status is red
            settings: { routing: { allocation: { enable: 'all' } } },
          },
        });
        indexYellow = true;
      }, 10);

      await createIndexPromise.then((res) => {
        // Assert that the promise didn't resolve before the index became green
        expect(indexYellow).toBe(true);
        expect(res).toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "create_index_succeeded",
                }
              `);
      });
    });
    it('rejects when there is an unexpected error creating the index', async () => {
      // Creating an index with the same name as an existing alias to induce
      // failure
      await expect(
        createIndex({ client, indexName: 'existing_index_2_alias', mappings: undefined as any })()
      ).rejects.toThrow('invalid_index_name_exception');
    });
  });

  describe('bulkOverwriteTransformedDocuments', () => {
    it('resolves right when documents do not yet exist in the index', async () => {
      const newDocs = [
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown as SavedObjectsRawDoc[];
      const task = bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_with_docs',
        transformedDocs: newDocs,
        refresh: 'wait_for',
      });

      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "bulk_index_succeeded",
        }
      `);
    });
    it('resolves right even if there were some version_conflict_engine_exception', async () => {
      const existingDocs = (
        (await searchForOutdatedDocuments(client, {
          batchSize: 1000,
          targetIndex: 'existing_index_with_docs',
          outdatedDocumentsQuery: undefined,
        })()) as Either.Right<SearchResponse>
      ).right.outdatedDocuments;

      const task = bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_with_docs',
        transformedDocs: [
          ...existingDocs,
          { _source: { title: 'doc 8' } } as unknown as SavedObjectsRawDoc,
        ],
        refresh: 'wait_for',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
    it('resolves left target_index_had_write_block if there are write_block errors', async () => {
      const newDocs = [
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown as SavedObjectsRawDoc[];
      await expect(
        bulkOverwriteTransformedDocuments({
          client,
          index: 'existing_index_with_write_block',
          transformedDocs: newDocs,
          refresh: 'wait_for',
        })()
      ).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "target_index_had_write_block",
          },
        }
      `);
    });
    // TODO: unskip after https://github.com/elastic/kibana/issues/116111
    it.skip('resolves left request_entity_too_large_exception when the payload is too large', async () => {
      const newDocs = new Array(10000).fill({
        _source: {
          title:
            'how do I create a document thats large enoug to exceed the limits without typing long sentences',
        },
      }) as SavedObjectsRawDoc[];
      const task = bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_with_docs',
        transformedDocs: newDocs,
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "request_entity_too_large_exception",
          },
        }
      `);
    });
  });
});
