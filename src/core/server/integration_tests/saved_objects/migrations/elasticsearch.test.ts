/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { startElasticsearch } from './kibana_migrator_test_kit';
import { delay } from './test_utils';

describe('elasticsearch server', () => {
  let esServer: TestElasticsearchUtils['es'];

  beforeAll(async () => {
    esServer = await startElasticsearch();
  });

  it('runs and runs and runs', async () => await delay(24 * 3600));

  afterAll(async () => {
    await esServer?.stop();
    await delay(10);
  });
});
