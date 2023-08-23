/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createServerlessES,
  createServerlessKibana,
  TestServerlessESUtils,
  TestServerlessKibanaUtils,
  request,
} from '@kbn/core-test-helpers-kbn-server';

describe('smoke', () => {
  let serverlessES: TestServerlessESUtils;
  let serverlessKibana: TestServerlessKibanaUtils;
  jest.setTimeout(600_000);
  beforeEach(() => {
    serverlessES = createServerlessES();
    serverlessKibana = createServerlessKibana();
  });
  afterEach(async () => {
    await serverlessES?.stop();
    await serverlessKibana?.shutdown();
  });
  test('it can start Kibana and ES serverless', async () => {
    async function doIt() {
      console.log('ES STARTING');
      await serverlessES.start();
      console.log('ES STARTED');
      await serverlessKibana.preboot();
      console.log('KIBANA PREBOOTED');
      await serverlessKibana.setup();
      console.log('KIBANA SETUP');
      await serverlessKibana.start();
      console.log('KIBANA STARTED');
    }
    await expect(doIt()).resolves.toBe(undefined);
    const { body } = await request.get(serverlessKibana, '/api/status').expect(200);
    expect(body).toMatchObject({ status: { overall: { level: 'available' } } });
  });
});
