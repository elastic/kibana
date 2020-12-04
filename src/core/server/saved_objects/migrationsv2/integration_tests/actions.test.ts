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
import { bulkIndex, createIndex, search, SearchResponse, updateAliases } from '../actions';
import * as Either from 'fp-ts/lib/Either';

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
    await createIndex(client, 'existing_index_2', { properties: {} })();
    await updateAliases(client, [
      { add: { index: 'existing_index_2', alias: 'existing_index_2_alias' } },
    ])();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  // move to unit test?
  describe('catchRetryableEsClientErrors returns left retryable_es_client_error for', () => {
    it.todo('NoLivingConnectionsError');
    it.todo('ConnectionError');
    it.todo('TimeoutError');
    it.todo('ResponseError of type snapshot_in_progress_exception');
    it.todo('ResponseError with retryable status code'); // 503,401,403,408,410
  });

  describe('fetchIndices', () => {
    it.todo("returns right empty record if some indices weren't found");
    it.todo('returns right record with found indices');
  });

  describe('setWriteBlock', () => {
    it.todo('returns left index_not_found_exception when the index does not exist');
  });

  describe('cloneIndex', () => {
    it.todo(
      'returns right after waiting for index status to be green if clone target already existed'
    );
  });

  describe('waitForReindexTask', () => {
    it.todo('returns left index_not_found_exception');
    it.todo('returns left target_index_had_write_block if all failures are due to a write block');
  });

  describe('waitForUpdateByQueryTask', () => {
    it.todo('throws if there are failures');
    it.todo('throws if there is an error');
    it.todo('returns right when successful');
  });

  describe('updateAliases', () => {
    describe('remove', () => {
      it('returns left index_not_found_exception when the index does not exist', () => {
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
        it('returns left alias_not_found_exception when alias does not exist on specified index', async () => {
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
        it('returns left alias_not_found_exception when alias does not exist', async () => {
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
    it('returns right after waiting for an index status to be green if the index already existed', async () => {
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
  });

  describe('bulkIndex', () => {
    beforeAll(async () => {
      const sourceDocs = ([
        { _source: { title: 'doc 1' } },
        { _source: { title: 'doc 2' } },
        { _source: { title: 'doc 3' } },
        { _source: { title: 'doc 4' } },
      ] as unknown) as SavedObjectsRawDoc[];
      await bulkIndex(client, 'existing_index_1', sourceDocs)();
    });

    it('returns right when documents do not yet exist in the index', () => {
      const newDocs = ([
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown) as SavedObjectsRawDoc[];
      const task = bulkIndex(client, 'existing_index_1', newDocs);
      return expect(task()).resolves.toMatchInlineSnapshot(`
                Object {
                  "_tag": "Right",
                  "right": "bulk_index_succeeded",
                }
              `);
    });
    it('returns right even if there were some version_conflict_engine_exception', async () => {
      const existingDocs = ((await search(
        client,
        'existing_index_1',
        undefined as any
      )()) as Either.Right<SearchResponse>).right.hits;

      const task = bulkIndex(client, 'existing_index_1', [
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
