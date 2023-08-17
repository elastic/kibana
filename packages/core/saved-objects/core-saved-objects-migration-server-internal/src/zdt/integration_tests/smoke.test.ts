/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createServerlessES, TestServerlessESUtils } from '@kbn/core-test-helpers-kbn-server';

describe('smoke', () => {
  let serverlessES: TestServerlessESUtils;
  beforeEach(() => {
    serverlessES = createServerlessES();
  });
  afterEach(async () => {
    await serverlessES?.stop();
  });
  test('it can start ES serverless', async () => {
    expect(true).toBe(true);
  });
});
