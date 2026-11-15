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
  setFixtures,
} from '../fixtures/emulated_connector';

const EMULATOR_NAME = 'censys';
const VENDOR = 'https://api.platform.censys.io/v3';
const ORGANIZATION_ID = '8f2c9a1e-4b7d-4e3a-9c5f-1d2e3f4a5b6c';

/**
 * Runs the Censys host lookups through Kibana's actions API against the connector emulator. See
 * firecrawl_actions.spec.ts for how to start the emulator and the Scout servers; the emulator must
 * also serve `.censys`.
 */
apiTest.describe(
  'the Censys actions through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let control: EmulatorControl;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      control = await connectToEmulator(EMULATOR_NAME);
      credentials = await requestAuth.getApiKey('admin');
      connectorId = await createConnector(kbnClient, {
        connectorTypeId: '.censys',
        name: 'Censys against the emulator',
        config: { organizationId: ORGANIZATION_ID },
        secrets: { authType: 'bearer', token: 'a-token-the-emulator-accepts' },
      });
    });

    // Every test starts from no calls and no runtime fixtures.
    apiTest.beforeEach(async () => {
      await control.reset();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteConnector(kbnClient, connectorId);
    });

    apiTest('getHost asks for the host in the connector organization', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'getHost', {
        host: '8.8.8.8',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/global/asset/host/8.8.8.8`, {
        query: { organization_id: ORGANIZATION_ID },
        headers: { authorization: 'Bearer [redacted]' },
      });
    });

    apiTest('getHostEnrichment asks for the compact record of the host', async ({ apiClient }) => {
      const response = await executeAction(
        apiClient,
        credentials,
        connectorId,
        'getHostEnrichment',
        {
          host: '8.8.8.8',
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/global/asset/enrichment/host/8.8.8.8`, {
        query: { organization_id: ORGANIZATION_ID },
      });
    });

    apiTest('getHostHistory sends the time window of the timeline', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'getHostHistory', {
        host: '8.8.8.8',
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-31T23:59:59Z',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, `GET ${VENDOR}/global/asset/host/8.8.8.8/timeline`, {
        query: { organization_id: ORGANIZATION_ID },
      });
    });

    apiTest('reports a vendor error as an error, without a result', async ({ apiClient }) => {
      await setFixtures(control, [
        {
          operation: { source: 'platform', method: 'get', path: '/v3/global/asset/host/{host_id}' },
          response: { status: 429, body: { error: { code: 429, message: 'Too many requests' } } },
        },
      ]);

      const response = await executeAction(apiClient, credentials, connectorId, 'getHost', {
        host: '8.8.8.8',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
      expect(response.body.data).toBeUndefined();
      expect(await callsTo(control, `GET ${VENDOR}/global/asset/host/8.8.8.8`)).toHaveLength(1);
    });
  }
);
