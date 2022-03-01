/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '../../../../';
import { InternalCoreStart } from '../../../../internal_types';
import * as kbnTestServer from '../../../../../test_helpers/kbn_server';
import { Root } from '../../../../root';
import { isWriteBlockException } from '../es_errors';
import { createIndex } from '../create_index';
import { setWriteBlock } from '../set_write_block';

const { startES } = kbnTestServer.createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});

describe('Elasticsearch Errors', () => {
  let root: Root;
  let start: InternalCoreStart;
  let client: ElasticsearchClient;
  let esServer: kbnTestServer.TestElasticsearchUtils;

  beforeAll(async () => {
    esServer = await startES();
    root = kbnTestServer.createRootWithCorePlugins({
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
});
