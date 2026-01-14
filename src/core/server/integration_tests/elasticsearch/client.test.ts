/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esTestConfig } from '@kbn/test';
import * as http from 'http';
import { ReplaySubject, firstValueFrom } from 'rxjs';

import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { ElasticsearchStatusMeta } from '@kbn/core-elasticsearch-server-internal';

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
    await kibanaServer?.stop();
    await esServer?.stop();
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

describe('fake elasticsearch', () => {
  let esServer: http.Server;
  let kibanaServer: Root;
  let esStatus$: ReplaySubject<ServiceStatus<ElasticsearchStatusMeta>>;

  beforeAll(async () => {
    kibanaServer = createRootWithCorePlugins({
      elasticsearch: {
        healthCheck: { retry: 1 },
      },
      status: { allowAnonymous: true },
    });
    esServer = createFakeElasticsearchServer();

    await kibanaServer.preboot();
    const { elasticsearch } = await kibanaServer.setup();
    esStatus$ = new ReplaySubject(1);
    elasticsearch.status$.subscribe(esStatus$);

    // give kibanaServer's status Observables enough time to bootstrap
    // and emit a status after the initial "unavailable: Waiting for Elasticsearch"
    // set healthCheckRetry to 1, for faster testing
    // see https://github.com/elastic/kibana/issues/129754
    await new Promise((resolve) => setTimeout(resolve, 1500));
  });

  afterAll(async () => {
    await kibanaServer.shutdown();
    await new Promise<void>((resolve, reject) =>
      esServer.close((err) => (err ? reject(err) : resolve()))
    );
  });

  test('should return unknown product when it cannot perform the Product check (503 response)', async () => {
    const esStatus = await firstValueFrom(esStatus$);
    expect(esStatus.level.toString()).toBe('critical');
    expect(esStatus.summary).toBe(
      'Unable to retrieve version information from Elasticsearch nodes. The client noticed that the server is not Elasticsearch and we do not support this unknown product.'
    );
  });

  test('should fail to start Kibana because of the Product Check Error', async () => {
    await expect(kibanaServer.start()).rejects.toThrowError(
      'The client noticed that the server is not Elasticsearch and we do not support this unknown product.'
    );
  });
});
