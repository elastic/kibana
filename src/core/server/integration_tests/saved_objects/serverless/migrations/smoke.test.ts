/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  request,
  TestServerlessESUtils,
  TestServerlessKibanaUtils,
  createTestServerlessInstances,
} from '@kbn/core-test-helpers-kbn-server';

describe('Basic smoke test', () => {
  let serverlessES: TestServerlessESUtils;
  let serverlessKibana: TestServerlessKibanaUtils;
  let root: TestServerlessKibanaUtils['root'];

  beforeEach(async () => {
    const { startES, startKibana } = createTestServerlessInstances({
      adjustTimeout: jest.setTimeout,
    });
    serverlessES = await startES();
    serverlessKibana = await startKibana();
    root = serverlessKibana.root;
  });

  afterEach(async () => {
    await serverlessES?.stop();
    await serverlessKibana?.stop();
  });

  test('it can start Kibana running against serverless ES', async () => {
    const { body } = await request.get(root, '/api/status').expect(200);
    expect(body).toMatchObject({ status: { overall: { level: 'available' } } });
  });
});
