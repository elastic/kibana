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

import { ElasticsearchClient } from '../../../';
import { InternalCoreStart } from '../../../internal_types';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';
import { Root } from '../../../root';
import { SavedObjectsRawDoc } from '../../serialization';
import {
  bulkOverwriteTransformedDocuments,
  cloneIndex,
  createIndex,
  fetchIndices,
  reindex,
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
} from '../actions';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});
let esServer: kbnTestServer.TestElasticsearchUtils;

describe('migration actions', () => {
  let root: Root;
  let start: InternalCoreStart;
  let client: ElasticsearchClient;

  beforeAll(async () => {
    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({
      server: {
        basePath: '/hello',
      },
    });

    await root.setup();
    start = await root.start();
    client = start.elasticsearch.client.asInternalUser;

    // Create test fixture data:
    await createIndex(client, 'existing_index_with_docs', {
      dynamic: true as any,
      properties: {},
    })();
    const sourceDocs = ([
      { _source: { title: 'doc 1' } },
      { _source: { title: 'doc 2' } },
      { _source: { title: 'doc 3' } },
      { _source: { title: 'saved object 4' } },
    ] as unknown) as SavedObjectsRawDoc[];
    await bulkOverwriteTransformedDocuments(client, 'existing_index_with_docs', sourceDocs)();

    await createIndex(client, 'existing_index_2', { properties: {} })();
    await createIndex(client, 'existing_index_with_write_block', { properties: {} })();
    await bulkOverwriteTransformedDocuments(
      client,
      'existing_index_with_write_block',
      sourceDocs
    )();
    await setWriteBlock(client, 'existing_index_with_write_block')();
    await updateAliases(client, [
      { add: { index: 'existing_index_2', alias: 'existing_index_2_alias' } },
    ])();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  describe('fetchIndices', () => {
    it('resolves right empty record if no indices were found', async () => {
      expect.assertions(1);
      const task = fetchIndices(client, ['no_such_index']);
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": Object {},
                }
              `);
    });
    it('resolves right record with found indices', async () => {
      expect.assertions(1);
      const res = (await fetchIndices(client, [
        'no_such_index',
        'existing_index_with_docs',
      ])()) as Either.Right<unknown>;

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
      await createIndex(client, 'new_index_without_write_block', { properties: {} })();
    });
    it('resolves right when setting the write block succeeds', async () => {
      expect.assertions(1);
      const task = setWriteBlock(client, 'new_index_without_write_block');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "set_write_block_succeeded",
                }
              `);
    });
    it('resolves right when setting a write block on an index that already has one', async () => {
      expect.assertions(1);
      const task = setWriteBlock(client, 'existing_index_with_write_block');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "set_write_block_succeeded",
                }
              `);
    });
    it('once resolved, prevents further writes to the index', async () => {
      expect.assertions(1);
      const task = setWriteBlock(client, 'new_index_without_write_block');
      await task();
      const sourceDocs = ([
        { _source: { title: 'doc 1' } },
        { _source: { title: 'doc 2' } },
        { _source: { title: 'doc 3' } },
        { _source: { title: 'doc 4' } },
      ] as unknown) as SavedObjectsRawDoc[];
      await expect(
        bulkOverwriteTransformedDocuments(client, 'new_index_without_write_block', sourceDocs)()
      ).rejects.toMatchObject(expect.anything());
    });
    it('resolves left index_not_found_exception when the index does not exist', async () => {
      expect.assertions(1);
      const task = setWriteBlock(client, 'no_such_index');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "type": "index_not_found_exception",
                  },
                }
              `);
    });
  });

  describe('removeWriteBlock', () => {
    beforeAll(async () => {
      await createIndex(client, 'existing_index_without_write_block_2', { properties: {} })();
      await createIndex(client, 'existing_index_with_write_block_2', { properties: {} })();
      await setWriteBlock(client, 'existing_index_with_write_block_2')();
    });
    it('resolves right if successful when an index already has a write block', async () => {
      expect.assertions(1);
      const task = removeWriteBlock(client, 'existing_index_with_write_block_2');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "remove_write_block_succeeded",
                }
              `);
    });
    it('resolves right if successful when an index does not have a write block', async () => {
      expect.assertions(1);
      const task = removeWriteBlock(client, 'existing_index_without_write_block_2');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "remove_write_block_succeeded",
                }
              `);
    });
    it('rejects if there is a non-retryable error', async () => {
      expect.assertions(1);
      const task = removeWriteBlock(client, 'no_such_index');
      await expect(task()).rejects.toMatchInlineSnapshot(
        `[ResponseError: index_not_found_exception]`
      );
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
      expect.assertions(1);
      const task = cloneIndex(
        client,
        'existing_index_with_write_block',
        'clone_yellow_then_green_index_1'
      );
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
    it('resolves right after waiting for index status to be green if clone target already existed', async () => {
      expect.assertions(2);
      // Create a yellow index
      await client.indices.create({
        index: 'clone_yellow_then_green_index_2',
        body: {
          mappings: { properties: {} },
          settings: {
            // Allocate 1 replica so that this index stays yellow
            number_of_replicas: '1',
          },
        },
      });

      // Call clone even though the index already exists
      const cloneIndexPromise = cloneIndex(
        client,
        'existing_index_with_write_block',
        'clone_yellow_then_green_index_2'
      )();
      let indexGreen = false;

      setTimeout(() => {
        client.indices.putSettings({
          body: {
            index: {
              number_of_replicas: 0,
            },
          },
        });
        indexGreen = true;
      }, 10);

      await cloneIndexPromise.then((res) => {
        // Assert that the promise didn't resolve before the index became green
        expect(indexGreen).toBe(true);
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
      const task = cloneIndex(client, 'no_such_index', 'clone_yellow_then_green_index_3');
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

  // Reindex doesn't return any errors on it's own, so we have to test
  // together with waitForReindexTask
  describe('reindex & waitForReindexTask', () => {
    expect.assertions(2);
    it('resolves right when reindex succeeds without reindex script', async () => {
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, res.right.taskId, '10s');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "reindex_succeeded",
                }
              `);

      const results = ((await searchForOutdatedDocuments(
        client,
        'reindex_target',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title)).toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3",
          "saved object 4",
        ]
      `);
    });
    it('resolves right when reindex succeeds with reindex script', async () => {
      expect.assertions(2);
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_2',
        Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, res.right.taskId, '10s');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "reindex_succeeded",
                }
              `);
      const results = ((await searchForOutdatedDocuments(
        client,
        'reindex_target_2',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title)).toMatchInlineSnapshot(`
        Array [
          "doc 1_updated",
          "doc 2_updated",
          "doc 3_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves right, ignores version conflicts and does not update existing docs when reindex multiple times', async () => {
      expect.assertions(3);
      // Reindex with a script
      let res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_3',
        Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        false
      )()) as Either.Right<ReindexResponse>;
      let task = waitForReindexTask(client, res.right.taskId, '10s');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Right",
                        "right": "reindex_succeeded",
                      }
                  `);

      // reindex without a script
      res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_3',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      task = waitForReindexTask(client, res.right.taskId, '10s');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                      Object {
                        "_tag": "Right",
                        "right": "reindex_succeeded",
                      }
                  `);

      // Assert that documents weren't overrided by the second, unscripted reindex
      const results = ((await searchForOutdatedDocuments(
        client,
        'reindex_target_3',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title)).toMatchInlineSnapshot(`
        Array [
          "doc 1_updated",
          "doc 2_updated",
          "doc 3_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves right and proceeds to add missing documents if there are some existing docs conflicts', async () => {
      expect.assertions(2);
      // Simulate a reindex that only adds some of the documents from the
      // source index into the target index
      await createIndex(client, 'reindex_target_4', { properties: {} })();
      const sourceDocs = ((await searchForOutdatedDocuments(
        client,
        'existing_index_with_docs',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments
        .slice(0, 2)
        .map(({ _id, _source }) => ({
          _id,
          _source,
        }));
      await bulkOverwriteTransformedDocuments(client, 'reindex_target_4', sourceDocs)();

      // Now do a real reindex
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_4',
        Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, res.right.taskId, '10s');
      await expect(task()).resolves.toMatchInlineSnapshot(`
                        Object {
                          "_tag": "Right",
                          "right": "reindex_succeeded",
                        }
                  `);
      // Assert that existing documents weren't overrided, but that missing
      // documents were added by the reindex
      const results = ((await searchForOutdatedDocuments(
        client,
        'reindex_target_4',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(results.map((doc) => doc._source.title)).toMatchInlineSnapshot(`
        Array [
          "doc 1",
          "doc 2",
          "doc 3_updated",
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
      await createIndex(client, 'reindex_target_5', {
        dynamic: 'strict',
        properties: {
          /** no title field */
        },
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_5',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, reindexTaskId, '10s');

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
      await createIndex(client, 'reindex_target_6', {
        dynamic: 'false',
        properties: { title: { type: 'integer' } }, // integer is incompatible with string title
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_6',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, reindexTaskId, '10s');

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
      const res = (await reindex(
        client,
        'no_such_index',
        'reindex_target',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, res.right.taskId, '10s');
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
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'existing_index_with_write_block',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask(client, res.right.taskId, '10s');

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
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'existing_index_with_write_block',
        Option.none,
        true
      )()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask(client, res.right.taskId, '10s');

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
  });

  describe('verifyReindex', () => {
    it('resolves right if source and target indices have the same amount of documents', async () => {
      expect.assertions(1);
      const res = (await reindex(
        client,
        'existing_index_with_docs',
        'reindex_target_7',
        Option.none,
        false
      )()) as Either.Right<ReindexResponse>;
      await waitForReindexTask(client, res.right.taskId, '10s')();

      const task = verifyReindex(client, 'existing_index_with_docs', 'reindex_target_7');
      await expect(task()).resolves.toMatchInlineSnapshot(`
              Object {
                "_tag": "Right",
                "right": "verify_reindex_succeeded",
              }
            `);
    });
    it('resolves left if source and target indices have different amount of documents', async () => {
      expect.assertions(1);
      const task = verifyReindex(client, 'existing_index_with_docs', 'existing_index_2');
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
      let task = verifyReindex(client, 'no_such_index', 'existing_index_2');
      await expect(task()).rejects.toMatchInlineSnapshot(
        `[ResponseError: index_not_found_exception]`
      );

      task = verifyReindex(client, 'existing_index_2', 'no_such_index');
      await expect(task()).rejects.toMatchInlineSnapshot(
        `[ResponseError: index_not_found_exception]`
      );
    });
  });

  describe('searchForOutdatedDocuments', () => {
    it('only returns documents that match the outdatedDocumentsQuery', async () => {
      expect.assertions(2);
      const resultsWithQuery = ((await searchForOutdatedDocuments(
        client,
        'existing_index_with_docs',
        {
          match: { title: { query: 'doc' } },
        }
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(resultsWithQuery.length).toBe(3);

      const resultsWithoutQuery = ((await searchForOutdatedDocuments(
        client,
        'existing_index_with_docs',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(resultsWithoutQuery.length).toBe(4);
    });
    it('resolves with _id, _source, _seq_no and _primary_term', async () => {
      expect.assertions(1);
      const results = ((await searchForOutdatedDocuments(client, 'existing_index_with_docs', {
        match: { title: { query: 'doc' } },
      })()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(String),
            _seq_no: expect.any(Number),
            _primary_term: expect.any(Number),
            _source: expect.any(Object),
          }),
        ])
      );
    });
    // I haven't been able to find a way to reproduce a partial search result
    // it.todo('rejects if only partial search results can be obtained');
  });

  describe('waitForPickupUpdatedMappingsTask', () => {
    it('rejects if there are failures', async () => {
      expect.assertions(1);
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_write_block'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

      // We can't do a snapshot match because the response includes an index
      // id which ES assigns dynamically
      await expect(task()).rejects.toMatchObject({
        message: /pickupUpdatedMappings task failed with the following failures:\n\[\{\"index\":\"existing_index_with_write_block\"/,
      });
    });
    it('rejects if there is an error', async () => {
      expect.assertions(1);
      const res = (await pickupUpdatedMappings(
        client,
        'no_such_index'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

      await expect(task()).rejects.toMatchInlineSnapshot(`
                        [Error: pickupUpdatedMappings task failed with the following error:
                        {"type":"index_not_found_exception","reason":"no such index [no_such_index]","resource.type":"index_or_alias","resource.id":"no_such_index","index_uuid":"_na_","index":"no_such_index"}]
                    `);
    });
    it('resolves right when successful', async () => {
      expect.assertions(1);
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_docs'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

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
      expect.assertions(3);
      // Create an index without any mappings and insert documents into it
      await createIndex(client, 'existing_index_without_mappings', {
        dynamic: false as any,
        properties: {},
      })();
      const sourceDocs = ([
        { _source: { title: 'doc 1' } },
        { _source: { title: 'doc 2' } },
        { _source: { title: 'doc 3' } },
        { _source: { title: 'doc 4' } },
      ] as unknown) as SavedObjectsRawDoc[];
      await bulkOverwriteTransformedDocuments(
        client,
        'existing_index_without_mappings',
        sourceDocs
      )();

      // Assert that we can't search over the unmapped fields of the document
      const originalSearchResults = ((await searchForOutdatedDocuments(
        client,
        'existing_index_without_mappings',
        { match: { title: { query: 'doc' } } }
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(originalSearchResults.length).toBe(0);

      // Update and pickup mappings so that the title field is searchable
      const res = await updateAndPickupMappings(client, 'existing_index_without_mappings', {
        properties: {
          title: { type: 'text' },
        },
      })();
      expect(Either.isRight(res)).toBe(true);
      const taskId = (res as Either.Right<UpdateAndPickupMappingsResponse>).right.taskId;
      await waitForPickupUpdatedMappingsTask(client, taskId, '60s')();

      // Repeat the search expecting to be able to find the existing documents
      const pickedUpSearchResults = ((await searchForOutdatedDocuments(
        client,
        'existing_index_without_mappings',
        { match: { title: { query: 'doc' } } }
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(pickedUpSearchResults.length).toBe(4);
    });
  });

  describe('updateAliases', () => {
    describe('remove', () => {
      it('resolves left index_not_found_exception when the index does not exist', async () => {
        expect.assertions(1);
        const task = updateAliases(client, [
          {
            remove: {
              alias: 'no_such_alias',
              index: 'no_such_index',
              must_exist: false,
            },
          },
        ]);
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
          expect.assertions(1);
          const task = updateAliases(client, [
            {
              remove: {
                alias: 'no_such_alias',
                index: 'existing_index_with_docs',
                must_exist: false,
              },
            },
          ]);
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
          expect.assertions(1);
          const task = updateAliases(client, [
            {
              remove: {
                alias: 'existing_index_2_alias',
                index: 'existing_index_with_docs',
                must_exist: true,
              },
            },
          ]);
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
          expect.assertions(1);
          const task = updateAliases(client, [
            {
              remove: {
                alias: 'no_such_alias',
                index: 'existing_index_with_docs',
                must_exist: true,
              },
            },
          ]);
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
        expect.assertions(1);
        const task = updateAliases(client, [
          {
            remove_index: {
              index: 'no_such_index',
            },
          },
        ]);
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
        expect.assertions(1);
        const task = updateAliases(client, [
          {
            remove_index: {
              index: 'existing_index_2_alias',
            },
          },
        ]);
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
      await client.indices.delete({ index: 'yellow_then_green_index' });
    });
    it('resolves right after waiting for an index status to be green if the index already existed', async () => {
      expect.assertions(2);
      // Create a yellow index
      await client.indices.create(
        {
          index: 'yellow_then_green_index',
          body: {
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
            },
          },
        },
        { maxRetries: 0 /** handle retry ourselves for now */ }
      );

      // Call createIndex even though the index already exists
      const createIndexPromise = createIndex(client, 'yellow_then_green_index', undefined as any)();
      let indexGreen = false;

      setTimeout(() => {
        client.indices.putSettings({
          index: 'yellow_then_green_index',
          body: {
            index: {
              number_of_replicas: 0,
            },
          },
        });
        indexGreen = true;
      }, 10);

      await createIndexPromise.then((res) => {
        // Assert that the promise didn't resolve before the index became green
        expect(indexGreen).toBe(true);
        expect(res).toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "create_index_succeeded",
                }
              `);
      });
    });
    it('rejects when there is an unexpected error creating the index', async () => {
      expect.assertions(1);
      // Creating an index with the same name as an existing alias to induce
      // failure
      await expect(
        createIndex(client, 'existing_index_2_alias', undefined as any)()
      ).rejects.toMatchInlineSnapshot(`[ResponseError: invalid_index_name_exception]`);
    });
  });

  describe('bulkOverwriteTransformedDocuments', () => {
    it('resolves right when documents do not yet exist in the index', async () => {
      expect.assertions(1);
      const newDocs = ([
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown) as SavedObjectsRawDoc[];
      const task = bulkOverwriteTransformedDocuments(client, 'existing_index_with_docs', newDocs);
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
    it('resolves right even if there were some version_conflict_engine_exception', async () => {
      expect.assertions(1);
      const existingDocs = ((await searchForOutdatedDocuments(
        client,
        'existing_index_with_docs',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;

      const task = bulkOverwriteTransformedDocuments(client, 'existing_index_with_docs', [
        ...existingDocs,
        ({ _source: { title: 'doc 8' } } as unknown) as SavedObjectsRawDoc,
      ]);
      await expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
    it('rejects if there are errors', async () => {
      expect.assertions(1);
      const newDocs = ([
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown) as SavedObjectsRawDoc[];
      await expect(
        bulkOverwriteTransformedDocuments(client, 'existing_index_with_write_block', newDocs)()
      ).rejects.toMatchObject(expect.anything());
    });
  });
});
