/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { esTestConfig } from '@kbn/test';
import * as http from 'http';
import supertest from 'supertest';

import {
  createRootWithCorePlugins,
  createTestServers,
  TestElasticsearchUtils,
  TestKibanaUtils,
} from '../../../test_helpers/kbn_server';
import { Root } from '../../root';

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
    const resp1 =
      await kibanaServer.coreStart.elasticsearch.client.asInternalUser.indices.getSettings(
        {
          index: '.kibana',
        },
        { meta: true }
      );
    expect(resp1.headers).not.toHaveProperty('warning');

    // Also test setting it explicitly
    const resp2 =
      await kibanaServer.coreStart.elasticsearch.client.asInternalUser.indices.getSettings(
        { index: '.kibana' },
        { headers: { 'x-elastic-product-origin': 'kibana' }, meta: true }
      );
    expect(resp2.headers).not.toHaveProperty('warning');
  });
});

function createFakeElasticsearchServer() {
  const server = http.createServer((req, res) => {
    // Reply with a 200 and empty response by default (intentionally malformed response)
    res.writeHead(200);
    res.end();
  });
  server.listen(esTestConfig.getPort());

  return server;
}

// FLAKY: https://github.com/elastic/kibana/issues/129754
describe.skip('fake elasticsearch', () => {
  let esServer: http.Server;
  let kibanaServer: Root;
  let kibanaHttpServer: http.Server;

  beforeAll(async () => {
    kibanaServer = createRootWithCorePlugins({ status: { allowAnonymous: true } });
    esServer = createFakeElasticsearchServer();

    const kibanaPreboot = await kibanaServer.preboot();
    kibanaHttpServer = kibanaPreboot.http.server.listener; // Mind that we are using the prebootServer at this point because the migration gets hanging, while waiting for ES to be correct
    await kibanaServer.setup();
  });

  afterAll(async () => {
    await kibanaServer.shutdown();
    await new Promise<void>((resolve, reject) =>
      esServer.close((err) => (err ? reject(err) : resolve()))
    );
  });

  test('should return unknown product when it cannot perform the Product check (503 response)', async () => {
    const resp = await supertest(kibanaHttpServer).get('/api/status').expect(503);
    expect(resp.body.status.overall.level).toBe('critical');
    expect(resp.body.status.core.elasticsearch.summary).toBe(
      'Unable to retrieve version information from Elasticsearch nodes. The client noticed that the server is not Elasticsearch and we do not support this unknown product.'
    );
  });

  test('should fail to start Kibana because of the Product Check Error', async () => {
    await expect(kibanaServer.start()).rejects.toThrowError(
      'The client noticed that the server is not Elasticsearch and we do not support this unknown product.'
    );
  });
});
