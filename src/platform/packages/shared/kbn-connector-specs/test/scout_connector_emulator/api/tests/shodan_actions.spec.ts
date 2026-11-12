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

const EMULATOR_NAME = 'shodan';
const VENDOR = 'https://api.shodan.io/shodan';

/**
 * Runs the Shodan actions through Kibana's actions API against the connector emulator. See
 * firecrawl_actions.spec.ts for how to start the emulator and the Scout servers; the emulator must
 * also serve `.shodan`.
 */
apiTest.describe(
  'the Shodan actions through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let control: EmulatorControl;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      control = await connectToEmulator(EMULATOR_NAME);
      credentials = await requestAuth.getApiKey('admin');
      connectorId = await createConnector(kbnClient, {
        connectorTypeId: '.shodan',
        name: 'Shodan against the emulator',
        secrets: { authType: 'api_key_header', 'X-Api-Key': 'a-key-the-emulator-accepts' },
      });
    });

    // Every test starts from no calls and no runtime fixtures.
    apiTest.beforeEach(async () => {
      await control.reset();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteConnector(kbnClient, connectorId);
    });

    apiTest('searchHosts sends the query and the page', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'searchHosts', {
        query: 'apache country:DE',
        page: 2,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/host/search`, {
        query: { query: 'apache country:DE', page: '2' },
      });
    });

    apiTest('getHostInfo asks for the host it is given', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'getHostInfo', {
        ip: '8.8.8.8',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/host/8.8.8.8`);
    });

    apiTest('countResults sends the query and the facets', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'countResults', {
        query: 'nginx port:443',
        facets: 'country',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/host/count`, {
        query: { query: 'nginx port:443', facets: 'country' },
      });
    });

    apiTest('reports a vendor error as an error, without a result', async ({ apiClient }) => {
      await control.setFixtures([
        {
          operation: { source: 'rest', method: 'get', path: '/shodan/host/search' },
          response: { status: 429, body: { error: 'Request rate limit reached' } },
        },
      ]);

      const response = await executeAction(apiClient, credentials, connectorId, 'searchHosts', {
        query: 'apache',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
      expect(response.body.data).toBeUndefined();
      expect(await callsTo(control, `GET ${VENDOR}/host/search`)).toHaveLength(1);
    });
  }
);
