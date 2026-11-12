/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, EmulatorControl } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { setFixtures } from '../fixtures/emulated_connector';

// What the emulator calls `.firecrawl`: its connector id without the dot.
const EMULATOR_NAME = 'firecrawl';

const VENDOR = 'https://api.firecrawl.dev/v2';
const CRAWL_ID = '0b8e1c52-6a1f-4c3e-9d7a-2f4b5c6d7e8f';

const crawlStatus = (status: string) => ({
  status,
  total: 0,
  completed: 0,
  creditsUsed: 0,
  data: [],
});

/**
 * Runs every action of the Firecrawl connector through Kibana's actions API against the connector
 * emulator, which stands in for the vendor, using only the `connector_emulator` server config set:
 *
 *   node scripts/connector_emulate --all
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet connector_emulator
 *   node scripts/scout run-tests --arch stateful --domain classic --config <this folder>/../playwright.config.ts
 *
 * Each test checks what Kibana returned and what the emulator saw: the request it sent, which the
 * emulator checks against the vendor's spec, and the credential it kept out of what the emulator
 * shows.
 *
 * One emulator serves every connector to one Kibana, so tests share its state. Tests on different
 * connectors may run in parallel, as long as each scopes what it reads and resets to its connector,
 * as `control` does here. Tests on the same connector that set fixtures, read calls or reset must
 * run serially, which API tests do by default (as they would with `describe.serial`).
 */
apiTest.describe(
  'the Firecrawl actions through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let control: EmulatorControl;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      const { proxyUrl } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });
      control = createEmulatorControl(proxyUrl, { connector: EMULATOR_NAME });
      try {
        await control.reset();
      } catch (error) {
        throw new Error(
          `The connector emulator isn't answering at ${proxyUrl}: ${error}. Start it with ` +
            '"node scripts/connector_emulate --connector firecrawl" before the Scout servers, as Kibana ' +
            'trusts its CA only if it exists when Kibana starts.'
        );
      }

      credentials = await requestAuth.getApiKey('admin');
      const { data } = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/api/actions/connector',
        body: {
          connector_type_id: '.firecrawl',
          name: 'Firecrawl against the emulator',
          config: {},
          // The emulator accepts any credential.
          secrets: { authType: 'bearer', token: 'a-token-the-emulator-accepts' },
        },
      });
      connectorId = data.id;
    });

    // Every test starts from no calls and no runtime fixtures.
    apiTest.beforeEach(async () => {
      await control.reset();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({ method: 'DELETE', path: `/api/actions/connector/${connectorId}` });
    });

    const callsTo = async (request: string): Promise<ContractCall[]> =>
      (await control.calls()).calls.filter((call) => call.request === request);

    /** The one request the emulator saw, which it found valid, with the credential kept out. */
    const expectVendorRequest = async (request: string, body?: Record<string, unknown>) => {
      const calls = await callsTo(request);
      expect(calls).toHaveLength(1);
      const [call] = calls;
      expect(call).toMatchObject({ status: 200, requestViolations: [], responseViolations: [] });
      expect(call.captured?.request.headers.authorization).toBe('Bearer [redacted]');
      if (body) {
        expect(call.captured?.request.body).toMatchObject(body);
      }
    };

    const execute = (
      apiClient: ApiClientFixture,
      subAction: string,
      subActionParams: Record<string, unknown>
    ) =>
      apiClient.post(`/api/actions/connector/${connectorId}/_execute`, {
        headers: {
          ...credentials.apiKeyHeader,
          'kbn-xsrf': 'scout',
          'x-elastic-internal-origin': 'kibana',
        },
        body: { params: { subAction, subActionParams } },
      });

    apiTest(
      'scrape sends the page to scrape and returns what the vendor answers',
      async ({ apiClient }) => {
        const response = await execute(apiClient, 'scrape', {
          url: 'https://example.com',
          onlyMainContent: true,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        expect(response.body.data).toBeDefined();
        await expectVendorRequest(`POST ${VENDOR}/scrape`, {
          url: 'https://example.com',
          onlyMainContent: true,
        });
      }
    );

    apiTest('search sends the query and the limit', async ({ apiClient }) => {
      const response = await execute(apiClient, 'search', { query: 'kibana', limit: 3 });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });
      expect(response.body.data).toBeDefined();
      await expectVendorRequest(`POST ${VENDOR}/search`, { query: 'kibana', limit: 3 });
    });

    apiTest('map sends the site, the search term and the limit', async ({ apiClient }) => {
      const response = await execute(apiClient, 'map', {
        url: 'https://example.com',
        search: 'docs',
        limit: 5,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });
      expect(response.body.data).toBeDefined();
      await expectVendorRequest(`POST ${VENDOR}/map`, {
        url: 'https://example.com',
        search: 'docs',
        limit: 5,
      });
    });

    apiTest('crawl starts a crawl and returns its id', async ({ apiClient }) => {
      const response = await execute(apiClient, 'crawl', { url: 'https://example.com', limit: 2 });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });
      expect(typeof response.body.data.id).toBe('string');
      await expectVendorRequest(`POST ${VENDOR}/crawl`, { url: 'https://example.com', limit: 2 });
    });

    apiTest('getCrawlStatus asks for the crawl it is given', async ({ apiClient }) => {
      const response = await execute(apiClient, 'getCrawlStatus', { id: CRAWL_ID });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });
      expect(response.body.data).toBeDefined();
      await expectVendorRequest(`GET ${VENDOR}/crawl/${CRAWL_ID}`);
    });

    apiTest('crawlAndWait polls the crawl until it has completed', async ({ apiClient }) => {
      // The crawl is still running at the first poll, and has completed at the second.
      await setFixtures(control, [
        {
          operation: { source: 'v2', method: 'post', path: '/crawl' },
          response: {
            status: 200,
            body: { success: true, id: CRAWL_ID, url: `${VENDOR}/crawl/${CRAWL_ID}` },
          },
        },
        {
          operation: { source: 'v2', method: 'get', path: '/crawl/{id}' },
          responses: [
            { status: 200, body: crawlStatus('scraping') },
            { status: 200, body: crawlStatus('completed') },
          ],
        },
      ]);

      const response = await execute(apiClient, 'crawlAndWait', {
        url: 'https://example.com',
        pollIntervalMs: 1000,
        maxWaitMs: 30000,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok' });
      expect(response.body.data.status).toBe('completed');
      await expectVendorRequest(`POST ${VENDOR}/crawl`, { url: 'https://example.com' });
      expect(await callsTo(`GET ${VENDOR}/crawl/${CRAWL_ID}`)).toHaveLength(2);
    });

    apiTest('reports a vendor error as an error, without a result', async ({ apiClient }) => {
      await setFixtures(control, [
        {
          operation: { source: 'v2', method: 'post', path: '/search' },
          response: { status: 429, body: { success: false, error: 'Rate limit exceeded' } },
        },
      ]);

      const response = await execute(apiClient, 'search', { query: 'kibana' });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
      expect(response.body.data).toBeUndefined();
      expect(await callsTo(`POST ${VENDOR}/search`)).toHaveLength(1);
    });
  }
);
