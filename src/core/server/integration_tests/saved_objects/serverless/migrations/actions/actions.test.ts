/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Client } from '@elastic/elasticsearch';
import {
  type TestServerlessESUtils,
  createTestServerlessInstances,
} from '@kbn/core-test-helpers-kbn-server';

import * as ZDTActions from '@kbn/core-saved-objects-migration-server-internal/src/zdt/actions';

const TEST_INDEX_A = '.some_index_1';
const TEST_INDEX_A_ALIAS = '.some_index';
const TEST_INDEX_B = '.some_other_index_1';
const TEST_INDICES = [TEST_INDEX_A, TEST_INDEX_B];

describe('ZDT migration actions', () => {
  let serverlessES: TestServerlessESUtils;
  let client: Client;
  beforeAll(async () => {
    const { startES } = createTestServerlessInstances({
      adjustTimeout: jest.setTimeout,
    });
    serverlessES = await startES();
    client = serverlessES.es.getClient();
  });
  afterAll(async () => {
    await serverlessES?.stop();
  });
  beforeEach(async () => {
    await client.indices.delete({
      index: TEST_INDICES,
      ignore_unavailable: true,
    });
  });
  test('init', async () => {
    const task = ZDTActions.init({ client, indices: [TEST_INDEX_A, TEST_INDEX_B] });
    await expect(task()).resolves.toMatchInlineSnapshot(`
      Object {
        "_tag": "Right",
        "right": Object {},
      }
    `);
  });
  test('createIndex', async () => {
    const task = ZDTActions.createIndex({
      client,
      indexName: TEST_INDEX_A,
      mappings: { dynamic: false, properties: { test: { type: 'text' } } },
      aliases: [TEST_INDEX_A_ALIAS],
      timeout: '1s',
    });
    await expect(task()).resolves.toMatchInlineSnapshot(`
      Object {
        "_tag": "Right",
        "right": "create_index_succeeded",
      }
    `);
  });
});
