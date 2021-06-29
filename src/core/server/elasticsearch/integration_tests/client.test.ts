/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
} from '../../../test_helpers/kbn_server';

describe('elasticsearch clients', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({
      adjustTimeout: jest.setTimeout,
    });

    esServer = await startES();
    kibanaServer = await startKibana();
  });

  afterAll(async () => {
    await kibanaServer.stop();
    await esServer.stop();
  });

  it('does not return deprecation warning when x-elastic-product-origin header is set', async () => {
    // Header should be automatically set by Core
    const resp1 = await kibanaServer.coreStart.elasticsearch.client.asInternalUser.indices.getSettings(
      { index: '.kibana' }
    );
    expect(resp1.headers).not.toHaveProperty('warning');

    // Also test setting it explicitly
    const resp2 = await kibanaServer.coreStart.elasticsearch.client.asInternalUser.indices.getSettings(
      { index: '.kibana' },
      { headers: { 'x-elastic-product-origin': 'kibana' } }
    );
    expect(resp2.headers).not.toHaveProperty('warning');
  });

  it('returns deprecation warning when x-elastic-product-orign header is not set', async () => {
    const resp = await kibanaServer.coreStart.elasticsearch.client.asInternalUser.indices.getSettings(
      { index: '.kibana' },
      { headers: { 'x-elastic-product-origin': null } }
    );

    expect(resp.headers).toHaveProperty('warning');
    expect(resp.headers!.warning).toMatch('system indices');
  });
});
