/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import { Root } from '@kbn/core-root-server-internal';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { ElasticsearchClient } from '../../../../..';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  isWriteBlockException,
  isClusterShardLimitExceeded,
  createIndex,
  setWriteBlock,
} from '@kbn/core-saved-objects-migration-server-internal';

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});

describe('Elasticsearch Errors', () => {
  let root: Root;
  let start: InternalCoreStart;
  let client: ElasticsearchClient;
  let esServer: TestElasticsearchUtils;

  beforeAll(async () => {
    esServer = await startES();
    root = createRootWithCorePlugins({
      server: {
        basePath: '/foo',
      },
    });

    await root.preboot();
    await root.setup();
    start = await root.start();
    client = start.elasticsearch.client.asInternalUser;

    await createIndex({
      client,
      indexName: 'existing_index_with_write_block',
      mappings: { properties: {} },
      esCapabilities: elasticsearchServiceMock.createCapabilities(),
    })();
    await setWriteBlock({ client, index: 'existing_index_with_write_block' })();
  });

  afterAll(async () => {
    await esServer.stop();
    await root.shutdown();
  });

  describe('isWriteBlockException', () => {
    it('correctly identify errors from index operations', async () => {
      const res = await client.index(
        {
          index: 'existing_index_with_write_block',
          id: 'some-id',
          op_type: 'index',
          body: {
            hello: 'dolly',
          },
        },
        { ignore: [403] }
      );

      // @ts-expect-error @elastic/elasticsearch doesn't declare error on IndexResponse
      expect(isWriteBlockException(res.error!)).toEqual(true);
    });

    it('correctly identify errors from create operations', async () => {
      const res = await client.create(
        {
          index: 'existing_index_with_write_block',
          id: 'some-id',
          body: {
            hello: 'dolly',
          },
        },
        { ignore: [403] }
      );

      // @ts-expect-error @elastic/elasticsearch doesn't declare error on IndexResponse
      expect(isWriteBlockException(res.error!)).toEqual(true);
    });

    it('correctly identify errors from bulk index operations', async () => {
      const res = await client.bulk({
        refresh: 'wait_for',
        body: [
          {
            index: {
              _index: 'existing_index_with_write_block',
              _id: 'some-id',
            },
          },
          {
            hello: 'dolly',
          },
        ],
      });

      const cause = res.items[0].index!.error! as estypes.ErrorCause;

      expect(isWriteBlockException(cause)).toEqual(true);
    });

    it('correctly identify errors from bulk create operations', async () => {
      const res = await client.bulk({
        refresh: 'wait_for',
        body: [
          {
            create: {
              _index: 'existing_index_with_write_block',
              _id: 'some-id',
              op_type: 'index',
            },
          },
          {
            hello: 'dolly',
          },
        ],
      });

      const cause = res.items[0].create!.error! as estypes.ErrorCause;

      expect(isWriteBlockException(cause)).toEqual(true);
    });
  });
  describe('isClusterShardLimitExceeded', () => {
    beforeAll(async () => {
      await client.cluster.putSettings({ persistent: { cluster: { max_shards_per_node: 1 } } });
    });
    afterAll(async () => {
      await client.cluster.putSettings({ persistent: { cluster: { max_shards_per_node: null } } });
    });

    it('correctly identify errors from create index operation', async () => {
      const res = await client.indices.create(
        {
          index: 'new_test_index',
        },
        { ignore: [400] }
      );

      // @ts-expect-error @elastic/elasticsearch doesn't declare error on response
      expect(isClusterShardLimitExceeded(res.error)).toEqual(true);
    });
    it('correctly identify errors from clone index operation', async () => {
      const res = await client.indices.clone(
        {
          index: 'existing_index_with_write_block',
          target: 'new_test_index_2',
        },
        { ignore: [400] }
      );

      // @ts-expect-error @elastic/elasticsearch doesn't declare error on response
      expect(isClusterShardLimitExceeded(res.error)).toEqual(true);
    });
  });
});
