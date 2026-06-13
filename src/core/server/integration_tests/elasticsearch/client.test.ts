/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as http from 'http';
import type { AddressInfo } from 'net';
import { filter, firstValueFrom, tap, throwError, timeout, type Observable } from 'rxjs';

import type { Root } from '@kbn/core-root-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import type { ElasticsearchStatusMeta } from '@kbn/core-elasticsearch-server-internal';

const UNKNOWN_PRODUCT_ERROR =
  'The client noticed that the server is not Elasticsearch and we do not support this unknown product.';
const UNKNOWN_PRODUCT_STATUS_SUMMARY = `Unable to retrieve version information from Elasticsearch nodes. ${UNKNOWN_PRODUCT_ERROR}`;

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

function createFakeElasticsearchServer(): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Reply with a 200 and empty response by default (intentionally malformed response)
      res.writeHead(200);
      res.end();
    });
    server.on('error', reject);
    // Ask OS for any available ephemeral port
    server.listen(0, () => resolve(server));
  });
}

describe('fake elasticsearch', () => {
  let esServer: http.Server;
  let kibanaServer: Root;
  let esStatus$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
  let currentStatus: undefined | ServiceStatus<ElasticsearchStatusMeta>;

  const waitForUnknownProductStatus = () => {
    const expectedStatusSummary = UNKNOWN_PRODUCT_STATUS_SUMMARY;
    const observedStatuses: string[] = [];

    return firstValueFrom(
      esStatus$.pipe(
        tap((status) => {
          currentStatus = status;
          observedStatuses.push(`${status.level.toString()}: ${status.summary}`);
        }),
        filter(
          (status) =>
            status.level === ServiceStatusLevels.critical &&
            status.summary === expectedStatusSummary
        ),
        timeout({
          first: 30_000,
          with: () =>
            throwError(
              () =>
                new Error(
                  [
                    'Timed out waiting for Elasticsearch status.',
                    `Expected: ${ServiceStatusLevels.critical.toString()}: ${expectedStatusSummary}`,
                    `Observed: ${
                      observedStatuses.length ? observedStatuses.join(' | ') : '<none>'
                    }`,
                  ].join('\n')
                )
            ),
        })
      )
    );
  };

  beforeAll(async () => {
    esServer = await createFakeElasticsearchServer();
    const esAddress = esServer.address() as AddressInfo;

    kibanaServer = createRootWithCorePlugins({
      elasticsearch: {
        hosts: [`http://localhost:${esAddress.port}`],
        healthCheck: { retry: 1 },
      },
      status: { allowAnonymous: true },
    });

    await kibanaServer.preboot();
    const { elasticsearch } = await kibanaServer.setup();
    esStatus$ = elasticsearch.status$;
  });

  afterAll(async () => {
    await kibanaServer.shutdown();
    await new Promise<void>((resolve, reject) =>
      esServer.close((err) => (err ? reject(err) : resolve()))
    );
  });

  test('should return unknown product when it cannot perform the Product check (503 response)', async () => {
    await waitForUnknownProductStatus();
    expect(currentStatus?.level.toString()).toBe('critical');
    expect(currentStatus?.summary).toBe(UNKNOWN_PRODUCT_STATUS_SUMMARY);
  });

  test('should fail to start Kibana because of the Product Check Error', async () => {
    await waitForUnknownProductStatus();
    await expect(kibanaServer.start()).rejects.toThrowError(UNKNOWN_PRODUCT_ERROR);
  });
});
