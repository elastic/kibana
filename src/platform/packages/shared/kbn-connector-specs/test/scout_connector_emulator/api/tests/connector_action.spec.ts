/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// What the emulator calls `.firecrawl`: its connector id without the dot.
const EMULATOR_NAME = 'firecrawl';

/**
 * Runs a connector action through Kibana's actions API against the connector emulator, which stands
 * in for the vendor, using only the `connector_emulator` server config set:
 *
 *   node scripts/connector_emulate --all
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet connector_emulator
 *   node scripts/scout run-tests --arch stateful --domain classic --config <this folder>/playwright.config.ts
 *
 * One emulator serves every connector to one Kibana, so tests share its state. Tests on different
 * connectors may run in parallel, as long as each scopes what it reads and resets to its connector,
 * as `control` does here. Tests on the same connector that set fixtures, read calls or reset must
 * run serially, which API tests do by default (as they would with `describe.serial`).
 */
apiTest.describe(
  'a connector action through Kibana against the connector emulator',
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
            '"node scripts/connector_emulate --all" before the Scout servers, as Kibana trusts its CA ' +
            'only if it exists when Kibana starts.'
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

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({ method: 'DELETE', path: `/api/actions/connector/${connectorId}` });
    });

    apiTest(
      'answers the action with what the emulator serves, after sending the request through it',
      async ({ apiClient }) => {
        await control.reset();

        const response = await apiClient.post(`/api/actions/connector/${connectorId}/_execute`, {
          headers: {
            ...credentials.apiKeyHeader,
            'kbn-xsrf': 'scout',
            'x-elastic-internal-origin': 'kibana',
          },
          body: { params: { subAction: 'search', subActionParams: { query: 'kibana' } } },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        expect(response.body.data).toBeDefined();

        // The request reached the vendor's host through the emulator, which found it valid.
        const { calls } = await control.calls();
        const call = calls.find(
          ({ request }) => request === 'POST https://api.firecrawl.dev/v2/search'
        );
        expect(call).toMatchObject({ status: 200, requestViolations: [], responseViolations: [] });
        // The credential Kibana sent is kept out of what the emulator shows.
        expect(call?.captured?.request.headers.authorization).toBe('Bearer [redacted]');
      }
    );
  }
);
