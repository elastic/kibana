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

const EMULATOR_NAME = 'jina';
const READER = 'POST https://r.jina.ai/';
const SEARCH = 'POST https://s.jina.ai/';

/**
 * Runs the Jina Reader actions through Kibana's actions API against the connector emulator. Jina
 * answers browsing from one host and searching from another. See firecrawl_actions.spec.ts for how
 * to start the emulator and the Scout servers; the emulator must also serve `.jina`.
 */
apiTest.describe(
  'the Jina Reader actions through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let control: EmulatorControl;
    let connectorId: string;

    apiTest.beforeAll(async ({ kbnClient, requestAuth }) => {
      control = await connectToEmulator(EMULATOR_NAME);
      credentials = await requestAuth.getApiKey('admin');
      connectorId = await createConnector(kbnClient, {
        connectorTypeId: '.jina',
        name: 'Jina Reader against the emulator',
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

    apiTest('browse sends the page to turn into markdown', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'browse', {
        url: 'https://example.com',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, READER, {
        body: { url: 'https://example.com' },
        headers: { authorization: 'Bearer [redacted]' },
      });
    });

    apiTest('search sends the query to the search host', async ({ apiClient }) => {
      const response = await executeAction(apiClient, credentials, connectorId, 'search', {
        query: 'kibana',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
      await expectVendorRequest(control, SEARCH, { body: { q: 'kibana' } });
      expect(await callsTo(control, READER)).toHaveLength(0);
    });
  }
);
