/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import * as Option from 'fp-ts/Option';
import { errors } from '@elastic/elasticsearch';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type {
  ElasticsearchClient,
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import { getCapabilitiesFromClient } from '@kbn/core-elasticsearch-server-internal';
import {
  bulkOverwriteTransformedDocuments,
  closePit,
  createIndex,
  openPit,
  type OpenPitResponse,
  reindex,
  readWithPit,
  type EsResponseTooLargeError,
  type ReadWithPit,
  setWriteBlock,
  updateAliases,
  waitForReindexTask,
  type ReindexResponse,
  waitForPickupUpdatedMappingsTask,
  pickupUpdatedMappings,
  type UpdateByQueryResponse,
  updateAndPickupMappings,
  type UpdateAndPickupMappingsResponse,
  updateMappings,
  removeWriteBlock,
  transformDocs,
  waitForIndexStatus,
  fetchIndices,
  cloneIndex,
  type DocumentsTransformFailed,
  type DocumentsTransformSuccess,
  createBulkIndexOperationTuple,
  checkClusterRoutingAllocationEnabled,
} from '@kbn/core-saved-objects-migration-server-internal';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

interface EsServer {
  stop: () => Promise<void>;
}

type StartEs = () => Promise<{
  esServer: EsServer;
  client: ElasticsearchClient;
}>;

export const runActionTestSuite = ({
  startEs,
  environment,
}: {
  startEs: StartEs;
  environment: 'traditional' | 'serverless';
}) => {
  let esServer: EsServer;
  let client: ElasticsearchClient;
  let esCapabilities: ElasticsearchCapabilities;

  const runOnTraditionalOnly = (fn: Function) => {
    if (environment === 'traditional') {
      fn();
    }
  };

  beforeAll(async () => {
    // start ES and get capabilities
    const { esServer: _esServer, client: _client } = await startEs();
    esServer = _esServer;
    client = _client;
    esCapabilities = await getCapabilitiesFromClient(client);
  });

  beforeAll(async () => {
    // Create small size test fixture data
    await createIndex({
      client,
      indexName: 'existing_index_with_docs',
      aliases: ['existing_index_with_docs_alias'],
      esCapabilities,
      mappings: {
        // @ts-expect-error allowed for test purposes only (dynamic mapping definition)
        dynamic: true,
        properties: {
          someProperty: {
            type: 'integer',
          },
        },
        _meta: {
          migrationMappingPropertyHashes: {
            references: '7997cf5a56cc02bdc9c93361bde732b0',
          },
        },
      },
    })();
    const docs = [
      { _source: { title: 'doc 1', order: 1 } },
      { _source: { title: 'doc 2', order: 2 } },
      { _source: { title: 'doc 3', order: 3 } },
      { _source: { title: 'saved object 4', type: 'another_unused_type', order: 4 } },
      { _source: { title: 'f-agent-event 5', type: 'f_agent_event', order: 5 } },
      {
        _source: { title: new Array(1000).fill('a').join(), type: 'large' },
      }, // "large" saved objects
    ] as unknown as SavedObjectsRawDoc[];
    await bulkOverwriteTransformedDocuments({
      client,
      index: 'existing_index_with_docs',
      operations: docs.map((doc) => createBulkIndexOperationTuple(doc)),
      refresh: 'wait_for',
    })();

    await createIndex({
      client,
      indexName: 'existing_index_2',
      mappings: { properties: {} },
      esCapabilities,
    })();
    await createIndex({
      client,
      indexName: 'existing_index_with_write_block',
      mappings: { properties: {} },
      esCapabilities,
    })();
    await bulkOverwriteTransformedDocuments({
      client,
      index: 'existing_index_with_write_block',
      operations: docs.map((doc) => createBulkIndexOperationTuple(doc)),
      refresh: 'wait_for',
    })();
    await setWriteBlock({ client, index: 'existing_index_with_write_block' })();
    await updateAliases({
      client,
      aliasActions: [{ add: { index: 'existing_index_2', alias: 'existing_index_2_alias' } }],
    })();
  });

  beforeAll(async () => {
    // Create large test fixture data (added dynamically to always stay at latest)
    await createIndex({
      client,
      indexName: 'existing_index_with_100k_docs',
      aliases: ['existing_index_with_100k_docs_alias'],
      esCapabilities,
      mappings: {
        // @ts-expect-error allowed for test purposes only (dynamic mapping definition)
        dynamic: true,
        properties: {},
      },
    })();
    const docs10k = new Array(10000).fill({
      _source: { title: new Array(1000).fill('a').join(), type: 'large' },
    }) as unknown as SavedObjectsRawDoc[]; // 10k "large" saved objects
    const operations = docs10k.map((doc) => createBulkIndexOperationTuple(doc));

    for (let i = 0; i < 10; i++) {
      await bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_with_100k_docs',
        operations,
        refresh: i === 10 ? 'wait_for' : false,
      })();
    }
  });

  afterAll(async () => {
    await client.indices.delete({ index: 'existing_index_with_docs' }).catch(() => ({}));
    await client.indices.delete({ index: 'existing_index_2' }).catch(() => ({}));
    await client.indices.delete({ index: 'existing_index_with_write_block' }).catch(() => ({}));

    await esServer?.stop();
  });

  describe('fetchIndices', () => {
    afterAll(async () => {
      await client.cluster.putSettings({
        persistent: {
          // Reset persistent test settings
          cluster: { routing: { allocation: { enable: null } } },
        },
      });
    });
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
          existing_index_with_docs: expect.objectContaining({
            aliases: {
              existing_index_with_docs_alias: {},
            },
            mappings: expect.anything(),
            settings: expect.anything(),
          }),
        })
      );
    });
    it('includes the _meta data of the indices in the response', async () => {
      expect.assertions(1);
      const res = (await fetchIndices({
        client,
        indices: ['existing_index_with_docs'],
      })()) as Either.Right<unknown>;

      expect(res.right).toEqual(
        expect.objectContaining({
          existing_index_with_docs: expect.objectContaining({
            aliases: {
              existing_index_with_docs_alias: {},
            },
            mappings: {
              // FIXME https://github.com/elastic/elasticsearch-js/issues/1796
              dynamic: 'true',
              properties: expect.anything(),
              _meta: {
                migrationMappingPropertyHashes: {
                  references: '7997cf5a56cc02bdc9c93361bde732b0',
                },
              },
            },
            settings: expect.anything(),
          }),
        })
      );
    });
  });

  describe('checkClusterRoutingAllocation', () => {
    it('resolves left when cluster.routing.allocation.enabled is incompatible', async () => {
      expect.assertions(3);
      await client.cluster.putSettings({
        persistent: {
          // Disable all routing allocation
          cluster: { routing: { allocation: { enable: 'none' } } },
        },
      });
      const task = checkClusterRoutingAllocationEnabled(client);
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "incompatible_cluster_routing_allocation",
          },
        }
      `);
      await client.cluster.putSettings({
        persistent: {
          // Allow routing to existing primaries only
          cluster: { routing: { allocation: { enable: 'primaries' } } },
        },
      });
      const task2 = checkClusterRoutingAllocationEnabled(client);
      await expect(task2()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "incompatible_cluster_routing_allocation",
          },
        }
      `);
      await client.cluster.putSettings({
        persistent: {
          // Allow routing to new primaries only
          cluster: { routing: { allocation: { enable: 'new_primaries' } } },
        },
      });
      const task3 = checkClusterRoutingAllocationEnabled(client);
      await expect(task3()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "incompatible_cluster_routing_allocation",
          },
        }
      `);
    });
    it('resolves right when cluster.routing.allocation.enabled=all', async () => {
      expect.assertions(1);
      await client.cluster.putSettings({
        persistent: {
          cluster: { routing: { allocation: { enable: 'all' } } },
        },
      });
      const task = checkClusterRoutingAllocationEnabled(client);
      const result = await task();
      expect(Either.isRight(result)).toBe(true);
    });
  });

  describe('setWriteBlock', () => {
    beforeAll(async () => {
      await createIndex({
        client,
        indexName: 'new_index_without_write_block',
        mappings: { properties: {} },
        esCapabilities,
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
        operations: sourceDocs.map((doc) => createBulkIndexOperationTuple(doc)),
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
        esCapabilities,
      })();
      await createIndex({
        client,
        indexName: 'existing_index_with_write_block_2',
        mappings: { properties: {} },
        esCapabilities,
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

  describe('waitForIndexStatus', () => {
    afterEach(async () => {
      await client.indices.delete({ index: 'red_then_yellow_index' }).catch(() => ({}));
      await client.indices.delete({ index: 'red_index' }).catch(() => ({}));
    });

    // routing allocation and number_of_replicas settings not supported on serverless
    runOnTraditionalOnly(() => {
      it('resolves right after waiting for an index status to be yellow if the index already existed', async () => {
        // Create a red index
        await client.indices.create(
          {
            index: 'red_then_yellow_index',
            timeout: '5s',
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
              // Disable all shard allocation so that the index status is red
              routing: { allocation: { enable: 'none' } },
            },
          },
          { maxRetries: 0 /** handle retry ourselves for now */ }
        );

        // Start tracking the index status
        const indexStatusPromise = waitForIndexStatus({
          client,
          index: 'red_then_yellow_index',
          status: 'yellow',
        })();

        const redStatusResponse = await client.cluster.health({ index: 'red_then_yellow_index' });
        expect(redStatusResponse.status).toBe('red');

        void client.indices.putSettings({
          index: 'red_then_yellow_index',
          settings: {
            // Enable all shard allocation so that the index status turns yellow
            routing: { allocation: { enable: 'all' } },
          },
        });

        await indexStatusPromise;
        // Assert that the promise didn't resolve before the index became yellow

        const yellowStatusResponse = await client.cluster.health({
          index: 'red_then_yellow_index',
        });
        expect(yellowStatusResponse.status).toBe('yellow');
      });
    });

    it('resolves left with "index_not_yellow_timeout" after waiting for an index status to be yellow timeout', async () => {
      // Create a red index
      await client.indices
        .create({
          index: 'red_index',
          timeout: '5s',
          mappings: { properties: {} },
          settings: {
            // Allocate no replicas so that this index stays red
            number_of_replicas: '0',
            // Disable all shard allocation so that the index status is red
            index: { routing: { allocation: { enable: 'none' } } },
          },
        })
        .catch((e) => {});
      // try to wait for index status yellow:
      const task = waitForIndexStatus({
        client,
        index: 'red_index',
        timeout: '1s',
        status: 'yellow',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Left",
            "left": Object {
              "message": "[index_not_yellow_timeout] Timeout waiting for the status of the [red_index] index to become 'yellow'",
              "type": "index_not_yellow_timeout",
            },
          }
      `);
    });

    it('resolves left with "index_not_green_timeout" after waiting for an index status to be green timeout', async () => {
      // Create a yellow index
      await client.indices
        .create({
          index: 'yellow_index',
          timeout: '5s',
          mappings: { properties: {} },
          settings: {
            // Allocate no replicas so that this index stays yellow
            number_of_replicas: '0',
          },
        })
        .catch((e) => {});
      // try to wait for index status yellow:
      const task = waitForIndexStatus({
        client,
        index: 'red_index',
        timeout: '1s',
        status: 'green',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "message": "[index_not_green_timeout] Timeout waiting for the status of the [red_index] index to become 'green'",
            "type": "index_not_green_timeout",
          },
        }
      `);
    });
  });

  // _clone is blocked on serverless
  runOnTraditionalOnly(() => {
    describe('cloneIndex', () => {
      afterAll(async () => {
        try {
          // Restore the default setting of 1000 shards per node
          await client.cluster.putSettings({
            persistent: { cluster: { max_shards_per_node: null } },
          });
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
          esCapabilities,
        });
        expect.assertions(3);
        await expect(task()).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Right",
            "right": Object {
              "acknowledged": true,
              "shardsAcknowledged": true,
            },
          }
        `);
        const { clone_target_1: cloneTarget1 } = await client.indices.getSettings({
          index: 'clone_target_1',
        });
        expect(cloneTarget1.settings?.index?.mapping?.total_fields?.limit).toBe('1500');
        expect(cloneTarget1.settings?.blocks?.write).toBeUndefined();
      });
      it('resolves right if clone target already existed after waiting for index status to be green ', async () => {
        expect.assertions(2);

        // Create a red index that we later turn into green
        await client.indices
          .create({
            index: 'clone_red_then_green_index',
            timeout: '5s',
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index can go to green
              number_of_replicas: '0',
              // Disable all shard allocation so that the index status is red
              index: { routing: { allocation: { enable: 'none' } } },
            },
          })
          .catch((e) => {});

        // Call clone even though the index already exists
        const cloneIndexPromise = cloneIndex({
          client,
          source: 'existing_index_with_write_block',
          target: 'clone_red_then_green_index',
          esCapabilities,
        })();

        let indexGreen = false;
        setTimeout(() => {
          void client.indices.putSettings({
            index: 'clone_red_then_green_index',
            settings: {
              // Enable all shard allocation so that the index status goes green
              routing: { allocation: { enable: 'all' } },
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
      it('resolves left with a index_not_green_timeout if clone target already exists but takes longer than the specified timeout before turning green', async () => {
        // Create a red index
        await client.indices
          .create({
            index: 'clone_red_index',
            timeout: '5s',
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
              // Disable all shard allocation so that the index status is red
              index: { routing: { allocation: { enable: 'none' } } },
            },
          })
          .catch((e) => {});

        // Call clone even though the index already exists
        let cloneIndexPromise = cloneIndex({
          client,
          source: 'existing_index_with_write_block',
          target: 'clone_red_index',
          timeout: '1s',
          esCapabilities,
        })();

        await expect(cloneIndexPromise).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Left",
            "left": Object {
              "message": "[index_not_green_timeout] Timeout waiting for the status of the [clone_red_index] index to become 'green'",
              "type": "index_not_green_timeout",
            },
          }
        `);

        // Now make the index yellow and repeat

        await client.indices.putSettings({
          index: 'clone_red_index',
          settings: {
            // Enable all shard allocation so that the index status goes yellow
            routing: { allocation: { enable: 'all' } },
          },
        });

        // Call clone even though the index already exists
        cloneIndexPromise = cloneIndex({
          client,
          source: 'existing_index_with_write_block',
          target: 'clone_red_index',
          timeout: '1s',
          esCapabilities,
        })();

        await expect(cloneIndexPromise).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Left",
            "left": Object {
              "message": "[index_not_green_timeout] Timeout waiting for the status of the [clone_red_index] index to become 'green'",
              "type": "index_not_green_timeout",
            },
          }
        `);

        // Now make the index green and it should succeed

        await client.indices.putSettings({
          index: 'clone_red_index',
          settings: {
            // Set zero replicas so status goes green
            number_of_replicas: 0,
          },
        });

        // Call clone even though the index already exists
        cloneIndexPromise = cloneIndex({
          client,
          source: 'existing_index_with_write_block',
          target: 'clone_red_index',
          timeout: '30s',
          esCapabilities,
        })();

        await expect(cloneIndexPromise).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Right",
            "right": Object {
              "acknowledged": true,
              "shardsAcknowledged": true,
            },
          }
        `);
      });
      it('resolves left index_not_found_exception if the source index does not exist', async () => {
        expect.assertions(1);
        const task = cloneIndex({
          client,
          source: 'no_such_index',
          target: 'clone_target_3',
          esCapabilities,
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
      it('resolves left cluster_shard_limit_exceeded when the action would exceed the maximum normal open shards', async () => {
        // Set the max shards per node really low so that any new index that's created would exceed the maximum open shards for this cluster
        await client.cluster.putSettings({ persistent: { cluster: { max_shards_per_node: 1 } } });
        const cloneIndexPromise = cloneIndex({
          client,
          source: 'existing_index_with_write_block',
          target: 'clone_target_4',
          esCapabilities,
        })();
        await expect(cloneIndexPromise).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Left",
            "left": Object {
              "type": "cluster_shard_limit_exceeded",
            },
          }
        `);
      });
    });
  });

  // together with waitForReindexTask
  describe('reindex & waitForReindexTask', () => {
    it('resolves right when reindex succeeds without reindex script', async () => {
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target',
        reindexScript: Option.none,
        requireAlias: false,
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "reindex_succeeded",
        }
      `);

      const results = await client.search({ index: 'reindex_target', size: 1000 });
      expect((results.hits?.hits as SavedObjectsRawDoc[]).map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a",
          "doc 1",
          "doc 2",
          "doc 3",
          "f-agent-event 5",
          "saved object 4",
        ]
      `);
    });
    it('resolves right and excludes all documents not matching the excludeOnUpgradeQuery', async () => {
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_excluded_docs',
        reindexScript: Option.none,
        requireAlias: false,
        excludeOnUpgradeQuery: {
          bool: {
            must_not: ['f_agent_event', 'another_unused_type'].map((type) => ({
              term: { type },
            })),
          },
        },
        batchSize: 1000,
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "reindex_succeeded",
        }
      `);

      const results = await client.search({ index: 'reindex_target_excluded_docs', size: 1000 });
      expect((results.hits?.hits as SavedObjectsRawDoc[]).map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a",
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
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
      })()) as Either.Right<ReindexResponse>;
      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "reindex_succeeded",
        }
      `);

      const results = await client.search({ index: 'reindex_target_2', size: 1000 });
      expect((results.hits?.hits as SavedObjectsRawDoc[]).map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a_updated",
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
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
      })()) as Either.Right<ReindexResponse>;
      task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '10s' });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "reindex_succeeded",
        }
      `);

      // Assert that documents weren't overridden by the second, unscripted reindex
      const results = await client.search({ index: 'reindex_target_3', size: 1000 });
      expect((results.hits?.hits as SavedObjectsRawDoc[]).map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a_updated",
          "doc 1_updated",
          "doc 2_updated",
          "doc 3_updated",
          "f-agent-event 5_updated",
          "saved object 4_updated",
        ]
      `);
    });
    it('resolves right and proceeds to add missing documents if there are some existing docs conflicts', async () => {
      expect.assertions(4);
      // Simulate a reindex that only adds some of the documents from the
      // source index into the target index
      await createIndex({
        client,
        indexName: 'reindex_target_4',
        mappings: { properties: {} },
        esCapabilities,
      })();

      const response = await client.search({
        index: 'existing_index_with_docs',
        size: 2,
        sort: 'order',
      });

      const sourceDocs = (response.hits?.hits as SavedObjectsRawDoc[]).map(({ _id, _source }) => ({
        _id,
        _source,
      }));
      expect(sourceDocs[0]._source.title).toEqual('doc 1');
      expect(sourceDocs[1]._source.title).toEqual('doc 2');

      await bulkOverwriteTransformedDocuments({
        client,
        index: 'reindex_target_4',
        operations: sourceDocs.map((doc) => createBulkIndexOperationTuple(doc)),
        refresh: 'wait_for',
      })();

      // Now do a real reindex
      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_4',
        reindexScript: Option.some(`ctx._source.title = ctx._source.title + '_updated'`),
        requireAlias: false,
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
      const results = await client.search({ index: 'reindex_target_4', size: 1000 });
      expect((results.hits?.hits as SavedObjectsRawDoc[]).map((doc) => doc._source.title).sort())
        .toMatchInlineSnapshot(`
        Array [
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a_updated",
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
        esCapabilities,
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_5',
        reindexScript: Option.none,
        requireAlias: false,
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
        esCapabilities,
      })();

      const {
        right: { taskId: reindexTaskId },
      } = (await reindex({
        client,
        sourceIndex: 'existing_index_with_docs',
        targetIndex: 'reindex_target_6',
        reindexScript: Option.none,
        requireAlias: false,
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
        excludeOnUpgradeQuery: {
          match_all: {},
        },
        batchSize: 1000,
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
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
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
    it('resolves left wait_for_task_completion_timeout when the task does not finish within the timeout', async () => {
      const readyTaskRes = await waitForIndexStatus({
        client,
        index: 'existing_index_with_100k_docs',
        status: 'yellow',
        timeout: '300s',
      })();

      expect(Either.isRight(readyTaskRes)).toBe(true);

      const res = (await reindex({
        client,
        sourceIndex: 'existing_index_with_100k_docs',
        targetIndex: 'reindex_target_7',
        reindexScript: Option.none,
        requireAlias: false,
        excludeOnUpgradeQuery: { match_all: {} },
        batchSize: 1000,
      })()) as Either.Right<ReindexResponse>;

      const task = waitForReindexTask({ client, taskId: res.right.taskId, timeout: '0s' });

      await expect(task()).resolves.toMatchObject({
        _tag: 'Left',
        left: {
          error: expect.any(errors.ResponseError),
          message: expect.stringContaining('[timeout_exception]'),
          type: 'wait_for_task_completion_timeout',
        },
      });
    });
  });

  describe('openPit', () => {
    it('opens PointInTime for an index', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      expect(pitResponse.right.pitId).toEqual(expect.any(String));

      const searchResponse = await client.search({ pit: { id: pitResponse.right.pitId } });

      await expect(searchResponse.hits.hits.length).toBeGreaterThan(0);
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

      await expect(docsResponse.right.outdatedDocuments.length).toBe(6);
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
          "a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a,a",
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

    it('returns a left es_response_too_large error when a read batch exceeds the maxResponseSize', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      let readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: { match_all: {} },
        batchSize: 1, // small batch size so we don't exceed the maxResponseSize
        searchAfter: undefined,
        maxResponseSizeBytes: 5000, // make sure long ids don't cause es_response_too_large
      });
      const rightResponse = await readWithPitTask();

      if (Either.isLeft(rightResponse)) {
        throw new Error(
          `Expected a successful response but got ${JSON.stringify(rightResponse.left)}`
        );
      }

      readWithPitTask = readWithPit({
        client,
        pitId: pitResponse.right.pitId,
        query: { match_all: {} },
        batchSize: 10, // a bigger batch will exceed the maxResponseSize
        searchAfter: undefined,
        maxResponseSizeBytes: 1000, // set a small size to force the error
      });
      const leftResponse = (await readWithPitTask()) as Either.Left<EsResponseTooLargeError>;

      expect(leftResponse.left.type).toBe('es_response_too_large');
      expect(leftResponse.left.contentLength).toBeGreaterThanOrEqual(3184);
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

      await client.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: 'existing_index_with_docs', _id: 'pit-invalidation-doc' } },
          { type: 'test', value: 1 },
        ],
      });

      let response: SearchResponse;
      try {
        response = await client.search({ pit: { id: pitId } });
      } catch (err: unknown) {
        // if the search call throws, we're likely on a non-serverless environment
        // where the PIT simply became invalid
        const message = err instanceof Error ? err.message : String(err);
        expect(message).toContain('search_phase_execution_exception');
        return;
      }

      // at this point, we're likely on a serverless environment
      // the call succeeded but it contains failures
      expect(response._shards?.failed).toBeGreaterThanOrEqual(1);
      const failureReason =
        response._shards?.failures?.[0]?.reason?.reason ??
        response._shards?.failures?.[0]?.reason?.type ??
        '';
      expect(failureReason).toMatch(
        /No search context found for id|search_context_missing_exception/
      );
    });

    it('rejects search with closed PIT when allow_partial_search_results is false', async () => {
      const openPitTask = openPit({ client, index: 'existing_index_with_docs' });
      const pitResponse = (await openPitTask()) as Either.Right<OpenPitResponse>;

      const pitId = pitResponse.right.pitId;
      await closePit({ client, pitId })();

      await client.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: 'existing_index_with_docs', _id: 'pit-invalidation-doc-2' } },
          { type: 'test', value: 2 },
        ],
      });

      const searchTask = client.search({
        pit: { id: pitId },
        allow_partial_search_results: false,
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
        'existing_index_with_write_block',
        1000
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
        'no_such_index',
        1000
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
        'existing_index_with_100k_docs',
        1000
      )()) as Either.Right<UpdateByQueryResponse>;

      const task = waitForPickupUpdatedMappingsTask({
        client,
        taskId: res.right.taskId,
        timeout: '0s',
      });

      await expect(task()).resolves.toMatchObject({
        _tag: 'Left',
        left: {
          error: expect.any(errors.ResponseError),
          message: expect.stringContaining('[timeout_exception]'),
          type: 'wait_for_task_completion_timeout',
        },
      });
    });
    it('resolves right when successful', async () => {
      const res = (await pickupUpdatedMappings(
        client,
        'existing_index_with_docs',
        1000
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
        esCapabilities,
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
        operations: sourceDocs.map((doc) => createBulkIndexOperationTuple(doc)),
        refresh: 'wait_for',
      })();

      // Assert that we can't search over the unmapped fields of the document

      const originalSearchResults = await client.search({
        index: 'existing_index_without_mappings',
        size: 1000,
        query: {
          match: { title: { query: 'doc' } },
        },
      });
      expect(originalSearchResults.hits?.hits.length).toBe(0);

      // Update and pickup mappings so that the title field is searchable
      const res = await updateAndPickupMappings({
        client,
        index: 'existing_index_without_mappings',
        mappings: {
          properties: {
            title: { type: 'text' },
          },
        },
        batchSize: 1000,
      })();
      expect(Either.isRight(res)).toBe(true);
      const taskId = (res as Either.Right<UpdateAndPickupMappingsResponse>).right.taskId;
      await waitForPickupUpdatedMappingsTask({ client, taskId, timeout: '60s' })();

      // Repeat the search expecting to be able to find the existing documents
      const pickedUpSearchResults = await client.search({
        index: 'existing_index_without_mappings',
        size: 1000,
        query: {
          match: { title: { query: 'doc' } },
        },
      });
      expect(pickedUpSearchResults.hits?.hits.length).toBe(4);
    });
  });

  describe('updateMappings', () => {
    it('rejects if ES throws an error', async () => {
      const task = updateMappings({
        client,
        index: 'no_such_index',
        mappings: {
          properties: {
            created_at: {
              type: 'date',
            },
          },
          _meta: {
            migrationMappingPropertyHashes: {
              references: 'updateda56cc02bdc9c93361bupdated',
              newReferences: 'fooBarHashMd509387420934879300d9',
            },
          },
        },
      })();

      await expect(task).rejects.toThrow('index_not_found_exception');
    });

    it('resolves left when the mappings are incompatible', async () => {
      const res = await updateMappings({
        client,
        index: 'existing_index_with_docs',
        mappings: {
          properties: {
            someProperty: {
              type: 'date', // attempt to change an existing field's type in an incompatible fashion
            },
          },
          _meta: {
            migrationMappingPropertyHashes: {
              references: 'updateda56cc02bdc9c93361bupdated',
              newReferences: 'fooBarHashMd509387420934879300d9',
            },
          },
        },
      })();

      expect(Either.isLeft(res)).toBe(true);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "incompatible_mapping_exception",
          },
        }
      `);
    });

    it('resolves right when mappings are correctly updated', async () => {
      const res = await updateMappings({
        client,
        index: 'existing_index_with_docs',
        mappings: {
          properties: {
            created_at: {
              type: 'date',
            },
          },
          _meta: {
            migrationMappingPropertyHashes: {
              references: 'updateda56cc02bdc9c93361bupdated',
              newReferences: 'fooBarHashMd509387420934879300d9',
            },
          },
        },
      })();

      expect(Either.isRight(res)).toBe(true);

      const indices = await client.indices.get({
        index: ['existing_index_with_docs'],
      });

      expect(indices.existing_index_with_docs.mappings?.properties).toEqual(
        expect.objectContaining({
          created_at: {
            type: 'date',
          },
        })
      );

      expect(indices.existing_index_with_docs.mappings?._meta).toEqual({
        migrationMappingPropertyHashes: {
          references: 'updateda56cc02bdc9c93361bupdated',
          newReferences: 'fooBarHashMd509387420934879300d9',
        },
      });
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
    afterEach(async () => {
      // Restore the default setting of 1000 shards per node
      await client.cluster.putSettings({ persistent: { cluster: { max_shards_per_node: null } } });
    });
    afterAll(async () => {
      await client.indices.delete({ index: 'red_then_yellow_index' }).catch(() => ({}));
      await client.indices.delete({ index: 'yellow_then_green_index' }).catch(() => ({}));
      await client.indices.delete({ index: 'create_new_index' }).catch(() => ({}));
    });
    it('resolves right after waiting for an index status to become green when cluster state is not propagated within the timeout', async () => {
      // By specifying a very short timeout Elasticsearch will respond before the shard is allocated
      const createIndexPromise = createIndex({
        client,
        indexName: 'create_new_index',
        mappings: undefined as any,
        timeout: '1nanos',
        esCapabilities,
      })();
      await expect(createIndexPromise).resolves.toEqual({
        _tag: 'Right',
        right: 'create_index_succeeded',
      });
      const { create_new_index: createNewIndex } = await client.indices.getSettings({
        index: 'create_new_index',
      });
      // @ts-expect-error https://github.com/elastic/elasticsearch/issues/89381
      expect(createNewIndex.settings?.index?.mapping.total_fields.limit).toBe('1500');
    });

    // number_of_replicas and routing allocation not available on serverless
    runOnTraditionalOnly(() => {
      it('resolves left if an existing index status does not become green', async () => {
        expect.assertions(2);
        // Create a red index
        await client.indices
          .create(
            {
              index: 'red_then_yellow_index',
              timeout: '5s',
              mappings: { properties: {} },
              settings: {
                // Allocate 1 replica so that this index stays yellow
                number_of_replicas: '1',
                // Disable all shard allocation so that the index status starts as red
                index: { routing: { allocation: { enable: 'none' } } },
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
          esCapabilities,
        })();
        let indexYellow = false;

        setTimeout(() => {
          void client.indices.putSettings({
            index: 'red_then_yellow_index',
            settings: {
              // Renable allocation so that the status becomes yellow
              routing: { allocation: { enable: 'all' } },
            },
          });
          indexYellow = true;
        }, 10);

        await createIndexPromise.then((err) => {
          // Assert that the promise didn't resolve before the index became yellow
          expect(indexYellow).toBe(true);
          expect(err).toMatchInlineSnapshot(`
            Object {
              "_tag": "Left",
              "left": Object {
                "message": "[index_not_green_timeout] Timeout waiting for the status of the [red_then_yellow_index] index to become 'green'",
                "type": "index_not_green_timeout",
              },
            }
          `);
        });
      });
      it('resolves right after waiting for an existing index status to become green', async () => {
        expect.assertions(2);
        // Create a yellow index
        await client.indices
          .create({
            index: 'yellow_then_green_index',
            timeout: '5s',
            mappings: { properties: {} },
            settings: {
              // Allocate 1 replica so that this index stays yellow
              number_of_replicas: '1',
            },
          })
          .catch((e) => {
            /** ignore */
          });

        // Call createIndex even though the index already exists
        const createIndexPromise = createIndex({
          client,
          indexName: 'yellow_then_green_index',
          mappings: undefined as any,
          esCapabilities,
        })();
        let indexGreen = false;

        setTimeout(() => {
          void client.indices.putSettings({
            index: 'yellow_then_green_index',
            settings: {
              // Set 0 replican so that this index becomes green
              number_of_replicas: '0',
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
              "right": "index_already_exists",
            }
          `);
        });
      });
    });

    it('resolves left cluster_shard_limit_exceeded when the action would exceed the maximum normal open shards', async () => {
      // Set the max shards per node really low so that any new index that's created would exceed the maximum open shards for this cluster
      await client.cluster.putSettings({ persistent: { cluster: { max_shards_per_node: 1 } } });
      const createIndexPromise = createIndex({
        client,
        indexName: 'create_index_1',
        mappings: undefined as any,
        esCapabilities,
      })();
      await expect(createIndexPromise).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Left",
          "left": Object {
            "type": "cluster_shard_limit_exceeded",
          },
        }
      `);
    });
    it('rejects when there is an unexpected error creating the index', async () => {
      // Creating an index with the same name as an existing alias to induce
      // failure
      await expect(
        createIndex({
          client,
          indexName: 'existing_index_2_alias',
          mappings: undefined as any,
          esCapabilities,
        })()
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
        operations: newDocs.map((doc) => createBulkIndexOperationTuple(doc)),
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
      const response = await client.search({ index: 'existing_index_with_docs', size: 1000 });
      const existingDocs = response.hits?.hits as SavedObjectsRawDoc[];

      const task = bulkOverwriteTransformedDocuments({
        client,
        index: 'existing_index_with_docs',
        operations: [
          ...existingDocs,
          { _source: { title: 'doc 8' } } as unknown as SavedObjectsRawDoc,
        ].map((doc) => createBulkIndexOperationTuple(doc)),
        refresh: 'wait_for',
      });
      await expect(task()).resolves.toMatchInlineSnapshot(`
        Object {
          "_tag": "Right",
          "right": "bulk_index_succeeded",
        }
      `);
    });
    it('resolves left index_not_found_exception if the index does not exist and useAliasToPreventAutoCreate=true', async () => {
      const newDocs = [
        { _source: { title: 'doc 5' } },
        { _source: { title: 'doc 6' } },
        { _source: { title: 'doc 7' } },
      ] as unknown as SavedObjectsRawDoc[];
      await expect(
        bulkOverwriteTransformedDocuments({
          client,
          index: 'existing_index_with_docs_alias_that_does_not_exist',
          useAliasToPreventAutoCreate: true,
          operations: newDocs.map((doc) => createBulkIndexOperationTuple(doc)),
          refresh: 'wait_for',
        })()
      ).resolves.toMatchInlineSnapshot(`
          Object {
            "_tag": "Left",
            "left": Object {
              "index": "existing_index_with_docs_alias_that_does_not_exist",
              "type": "index_not_found_exception",
            },
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
          operations: newDocs.map((doc) => createBulkIndexOperationTuple(doc)),
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
  });
};
