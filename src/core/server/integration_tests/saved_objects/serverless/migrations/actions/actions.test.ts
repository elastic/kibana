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

/**
 * The intention with this set of tests is to ensure that we are able to run all ZDT actions against serverless ES. Do
 * not add tests here to ensure that sequences of actions work as expected. These should be added elsewhere.
 */
describe.skip('ZDT migration actions', () => {
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
  afterEach(async () => {
    await client.indices.delete({
      index: TEST_INDICES,
      ignore_unavailable: true,
    });
  });

  function runCreateIndexTask(indexName = TEST_INDEX_A) {
    return ZDTActions.createIndex({
      client,
      indexName,
      mappings: { dynamic: false, properties: { test: { type: 'text' } } },
      aliases: [TEST_INDEX_A_ALIAS],
      timeout: '1s',
    })();
  }
  function runUpdateIndexMappingsTask(index = TEST_INDEX_A) {
    return ZDTActions.updateAndPickupMappings({
      batchSize: 10,
      client,
      index,
      mappings: { dynamic: false, properties: { test: { type: 'text' } } },
      query: { match_all: {} },
    })();
  }
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
    await expect(runCreateIndexTask()).resolves.toMatchInlineSnapshot(`
      Object {
        "_tag": "Right",
        "right": "create_index_succeeded",
      }
    `);
  });
  test('updateIndexMappings', async () => {
    await runCreateIndexTask();
    await expect(runUpdateIndexMappingsTask()).resolves.toMatchObject({
      right: { taskId: expect.any(String) },
    });
  });
  test('waitForPickupUpdatedMappingsTask', async () => {
    await runCreateIndexTask();
    const {
      right: { taskId },
    } = (await runUpdateIndexMappingsTask()) as any;
    const task = ZDTActions.waitForPickupUpdatedMappingsTask({ client, taskId, timeout: '30s' });
    expect(task()).resolves.toMatchInlineSnapshot(`
      Object {
        "_tag": "Right",
        "right": "pickup_updated_mappings_succeeded",
      }
    `);
  });
});
