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
    await createIndex(client, 'existing_index_1', { dynamic: true as any, properties: {} })();
    const sourceDocs = ([
      { _source: { title: 'doc 1' } },
      { _source: { title: 'doc 2' } },
      { _source: { title: 'doc 3' } },
      { _source: { title: 'saved object 4' } },
    ] as unknown) as SavedObjectsRawDoc[];
    await bulkOverwriteTransformedDocuments(client, 'existing_index_1', sourceDocs)();

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
      const task = fetchIndices(client, ['no_such_index']);
      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": Object {},
                }
              `);
    });
    it('resolves right record with found indices', async () => {
      const res = (await fetchIndices(client, [
        'no_such_index',
        'existing_index_1',
      ])()) as Either.Right<unknown>;

      return expect(res.right).toEqual(
        expect.objectContaining({
          existing_index_1: {
            aliases: {},
            mappings: expect.anything(),
            settings: expect.anything(),
          },
        })
      );
    });
  });

  describe('setWriteBlock', () => {
    it('resolves left index_not_found_exception when the index does not exist', () => {
      const task = setWriteBlock(client, 'no_such_index');
      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "type": "index_not_found_exception",
                  },
                }
              `);
    });
  });

  describe('cloneIndex', () => {
    afterAll(async () => {
      await client.indices.delete({ index: 'yellow_then_green_index' });
    });
    it('resolves right after waiting for index status to be green if clone target already existed', async () => {
      // Create a yellow index
      await client.indices.create({
        index: 'yellow_then_green_index',
        body: {
          mappings: { properties: {} },
          settings: {
            // Allocate 1 replica so that this index stays yellow
            number_of_replicas: '1',
          },
        },
      });

      // Call clone even though the index already exists
      const cloneIndexPromise = cloneIndex(client, 'existing_index_1', 'yellow_then_green_index')();
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

      return cloneIndexPromise.then((res) => {
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
  });

  describe('waitForReindexTask', () => {
    it('resolves left index_not_found_exception if source index does not exist', async () => {
      const res = (await reindex(
        client,
        'no_such_index',
        'reindex_target',
        Option.none
      )()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask(client, res.right.taskId, '10s');
      return expect(task()).resolves.toMatchInlineSnapshot(`
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
      const res = (await reindex(
        client,
        'existing_index_1',
        'existing_index_with_write_block',
        Option.none
      )()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask(client, res.right.taskId, '10s');

      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Left",
                  "left": Object {
                    "type": "target_index_had_write_block",
                  },
                }
              `);
    });
  });

  describe('searchForOutdatedDocuments', () => {
    it('only returns documents that match the outdatedDocumentsQuery', async () => {
      const resultsWithQuery = ((await searchForOutdatedDocuments(client, 'existing_index_1', {
        match: { title: { query: 'doc' } },
      })()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(resultsWithQuery.length).toBe(3);

      const resultsWithoutQuery = ((await searchForOutdatedDocuments(
        client,
        'existing_index_1',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;
      expect(resultsWithoutQuery.length).toBe(4);
    });
    it('resolves with _id, _source, _seq_no and _primary_term', async () => {
      const results = ((await searchForOutdatedDocuments(client, 'existing_index_1', {
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
    // TODO: I haven't been able to find a way to reproduce a partial search result
    it.todo('rejects if only partial search results can be obtained');
  });

  describe('waitForPickupUpdatedMappingsTask', () => {
    it('rejects if there are failures', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_write_block'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

      // We can't do a snapshot match because the response includes an index
      // id which ES assigns dynamically
      return expect(task()).rejects.toMatchObject({
        message: /pickupUpdatedMappings task failed with the following failures:\n\[\{\"index\":\"existing_index_with_write_block\"/,
      });
    });
    it('rejects if there is an error', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'no_such_index'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

      return expect(task()).rejects.toMatchInlineSnapshot(`
                        [Error: pickupUpdatedMappings task failed with the following error:
                        {"type":"index_not_found_exception","reason":"no such index [no_such_index]","resource.type":"index_or_alias","resource.id":"no_such_index","index_uuid":"_na_","index":"no_such_index"}]
                    `);
    });
    it('resolves right when successful', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_1'
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask(client, res.right.taskId, '10s');

      return expect(task()).resolves.toMatchInlineSnapshot(`
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
      return expect(pickedUpSearchResults.length).toBe(4);
    });
  });

  describe('updateAliases', () => {
    describe('remove', () => {
      it('resolves left index_not_found_exception when the index does not exist', () => {
        const task = updateAliases(client, [
          {
            remove: {
              alias: 'no_such_alias',
              index: 'no_such_index',
              must_exist: false,
            },
          },
        ]);
        return expect(task()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "_tag": "Left",
                    "left": Object {
                      "index": "no_such_index",
                      "type": "index_not_found_exception",
                    },
                  }
                `);
      });
      describe('with must_exist=true', () => {
        it('resolves left alias_not_found_exception when alias does not exist on specified index', async () => {
          const task = updateAliases(client, [
            {
              remove: {
                alias: 'existing_index_2_alias',
                index: 'existing_index_1',
                must_exist: true,
              },
            },
          ]);
          return expect(task()).resolves.toMatchInlineSnapshot(`
                    Object {
                      "_tag": "Left",
                      "left": Object {
                        "type": "alias_not_found_exception",
                      },
                    }
                  `);
        });
        it('resolves left alias_not_found_exception when alias does not exist', async () => {
          const task = updateAliases(client, [
            {
              remove: {
                alias: 'no_such_alias',
                index: 'existing_index_1',
                must_exist: true,
              },
            },
          ]);
          return expect(task()).resolves.toMatchInlineSnapshot(`
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
      it('left index_not_found_exception if index does not exist', () => {
        const task = updateAliases(client, [
          {
            remove_index: {
              index: 'no_such_index',
            },
          },
        ]);
        return expect(task()).resolves.toMatchInlineSnapshot(`
                  Object {
                    "_tag": "Left",
                    "left": Object {
                      "index": "no_such_index",
                      "type": "index_not_found_exception",
                    },
                  }
                `);
      });
      it('left remove_index_not_a_concrete_index when remove_index targets an alias', () => {
        const task = updateAliases(client, [
          {
            remove_index: {
              index: 'existing_index_2_alias',
            },
          },
        ]);
        return expect(task()).resolves.toMatchInlineSnapshot(`
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
          body: {
            index: {
              number_of_replicas: 0,
            },
          },
        });
        indexGreen = true;
      }, 10);

      return createIndexPromise.then((res) => {
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
    it('rejects when there is an unexpected error creating the index', () => {
      // Creating an index with the same name as an existing alias to induce
      // failure
      expect(
        createIndex(client, 'existing_index_2_alias', undefined as any)()
      ).rejects.toMatchInlineSnapshot(`[ResponseError: invalid_index_name_exception]`);
    });
  });

  describe('bulkOverwriteTransformedDocuments', () => {
    it('resolves right when documents do not yet exist in the index', () => {
      const newDocs = ([
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown) as SavedObjectsRawDoc[];
      const task = bulkOverwriteTransformedDocuments(client, 'existing_index_1', newDocs);
      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
    it('resolves right even if there were some version_conflict_engine_exception', async () => {
      const existingDocs = ((await searchForOutdatedDocuments(
        client,
        'existing_index_1',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.outdatedDocuments;

      const task = bulkOverwriteTransformedDocuments(client, 'existing_index_1', [
        ...existingDocs,
        ({ _source: { title: 'doc 8' } } as unknown) as SavedObjectsRawDoc,
      ]);
      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
  });
});
