/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  callsTo,
  connectToEmulator,
  createConnector,
  deleteConnector,
  executeAction,
  expectVendorRequest,
} from '../fixtures/emulated_connector';

const EMULATOR_NAME = 'brave-search';
const SEARCH = 'GET https://api.search.brave.com/res/v1/web/search';

/**
 * Runs the Brave Search action through Kibana's actions API against the connector emulator. See
 * firecrawl_actions.spec.ts for how to start the emulator and the Scout servers; the emulator must
 * also serve `.brave-search`.
 */
apiTest.describe(
  'the Brave Search actions through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let control: EmulatorControl;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      control = await connectToEmulator(EMULATOR_NAME);
      credentials = await requestAuth.getApiKey('admin');
      connectorId = await createConnector(kbnClient, {
        connectorTypeId: '.brave-search',
        name: 'Brave Search against the emulator',
        secrets: {
          authType: 'api_key_header',
          'X-Subscription-Token': 'a-token-the-emulator-accepts',
        },
      });
    });

    // Every test starts from no calls and no runtime fixtures.
    apiTest.beforeEach(async () => {
      await control.reset();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteConnector(kbnClient, connectorId);
    });

    apiTest(
      'webSearch sends the query and the page size, and returns the results',
      async ({ apiClient }) => {
        const response = await executeAction(apiClient, credentials, connectorId, 'webSearch', {
          q: 'kibana',
          count: 3,
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        expect(response.body.data).toBeDefined();
        await expectVendorRequest(control, SEARCH, {
          query: { q: 'kibana', count: '3' },
          headers: { 'x-subscription-token': '[redacted]' },
        });
      }
    );

    apiTest(
      'webSearch asks for the page after the first one with an offset',
      async ({ apiClient }) => {
        const response = await executeAction(apiClient, credentials, connectorId, 'webSearch', {
          q: 'kibana',
          count: 5,
          offset: 2,
        });

        expect(response).toHaveStatusCode(200);
        await expectVendorRequest(control, SEARCH, { query: { count: '5', offset: '2' } });
      }
    );

    apiTest('reports a vendor error as an error, without a result', async ({ apiClient }) => {
      await control.setFixtures([
        {
          operation: { source: 'search', method: 'get', path: '/v1/web/search' },
          response: {
            status: 429,
            body: {
              type: 'ErrorResponse',
              error: { id: 'rate-limit', status: 429, code: 'RATE_LIMITED' },
            },
          },
        },
      ]);

      const response = await executeAction(apiClient, credentials, connectorId, 'webSearch', {
        q: 'kibana',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
      expect(response.body.data).toBeUndefined();
      expect(await callsTo(control, SEARCH)).toHaveLength(1);
    });
  }
);
