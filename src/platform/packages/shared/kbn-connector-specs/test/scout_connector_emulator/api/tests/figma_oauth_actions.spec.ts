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

const EMULATOR_NAME = 'figma';
const API = 'https://api.figma.com/v1';
const TOKEN = `POST ${API}/oauth/token`;
const ME = `GET ${API}/me`;

// Figma's defaults for its OAuth connector, which its spec names as the vendor's endpoints.
const AUTHORIZATION_URL = 'https://www.figma.com/oauth';
const SCOPE = 'current_user:read file_content:read projects:read';

/**
 * Runs Figma's OAuth 2 authorization code flow through Kibana against the connector emulator, which
 * stands in for Figma's token endpoint and API. A user would approve the connector at Figma and be
 * sent back to Kibana with a code; here the test stands in for the user and calls Kibana's callback
 * with a code itself, which the emulator accepts. Kibana trades it for tokens at the vendor, and the
 * actions then call the vendor with the access token. See firecrawl_actions.spec.ts for how to start
 * the emulator and the Scout servers; the emulator must also serve `.figma`.
 *
 * The tests depend on each other, as the connector is authorized once, so they run in order.
 */
apiTest.describe.serial(
  'the Figma OAuth flow through Kibana against the connector emulator',
  { tag: ['@local-stateful-classic'] },
  () => {
    let credentials: RoleApiCredentials;
    let sessionHeaders: Record<string, string>;
    let control: EmulatorControl;
    let connectorId: string;
    let kibanaUrl: string;

    apiTest.beforeAll(async ({ config, kbnClient, requestAuth, samlAuth }) => {
      control = await connectToEmulator(EMULATOR_NAME);
      credentials = await requestAuth.getApiKey('admin');

      // Starting the flow and the callback are internal routes of a signed-in user, not API keys.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      sessionHeaders = {
        ...cookieHeader,
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'kibana',
      };
      kibanaUrl = config.hosts.kibana.replace(/\/$/, '');

      connectorId = await createConnector(kbnClient, {
        connectorTypeId: '.figma',
        name: 'Figma against the emulator',
        secrets: {
          authType: 'oauth_authorization_code',
          // The emulator finds the connector a request is for by the client id.
          clientId: `emulate-${EMULATOR_NAME}`,
          clientSecret: 'a-secret-the-emulator-accepts',
          authorizationUrl: AUTHORIZATION_URL,
          tokenUrl: `${API}/oauth/token`,
          scope: SCOPE,
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
      'an action fails before the connector is authorized, without calling the vendor',
      async ({ apiClient }) => {
        const response = await executeAction(apiClient, credentials, connectorId, 'whoAmI', {});

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'error', connector_id: connectorId });
        expect((await control.calls()).calls).toStrictEqual([]);
      }
    );

    apiTest(
      'starting the flow sends the user to Figma with the client and a PKCE challenge',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `/internal/actions/connector/${connectorId}/_start_oauth_flow`,
          { headers: sessionHeaders, body: { returnUrl: `${kibanaUrl}/app/connectors` } }
        );

        expect(response).toHaveStatusCode(200);
        const { authorizationUrl, state } = response.body;
        const url = new URL(authorizationUrl);
        expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZATION_URL);
        expect(Object.fromEntries(url.searchParams)).toMatchObject({
          response_type: 'code',
          client_id: `emulate-${EMULATOR_NAME}`,
          scope: SCOPE,
          state,
          code_challenge_method: 'S256',
        });
        expect(Boolean(url.searchParams.get('code_challenge'))).toBe(true);
        expect(url.searchParams.get('redirect_uri')).toBe(
          `${kibanaUrl}/api/actions/connector/_oauth_callback`
        );
        // Nothing was sent to the vendor: the user's browser goes to Figma, not Kibana.
        expect((await control.calls()).calls).toStrictEqual([]);
      }
    );

    apiTest(
      'the callback trades the code for tokens at the vendor, and the action uses them',
      async ({ apiClient }) => {
        const start = await apiClient.post(
          `/internal/actions/connector/${connectorId}/_start_oauth_flow`,
          { headers: sessionHeaders, body: { returnUrl: `${kibanaUrl}/app/connectors` } }
        );
        expect(start).toHaveStatusCode(200);

        // Figma would send the user back here with a code once they had approved the connector.
        const callback = await apiClient.get(
          `/api/actions/connector/_oauth_callback?code=a-code-the-emulator-accepts&state=${start.body.state}`,
          { headers: sessionHeaders }
        );

        expect(callback).toHaveStatusCode(302);
        expect(callback.headers.location).toContain('oauth_authorization=success');
        await expectVendorRequest(control, TOKEN, {
          headers: { authorization: 'Basic [redacted]' },
        });

        const response = await executeAction(apiClient, credentials, connectorId, 'whoAmI', {});

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        await expectVendorRequest(control, ME, {
          headers: { authorization: 'Bearer [redacted]' },
        });
      }
    );

    apiTest(
      'an authorized connector keeps its token for the next action',
      async ({ apiClient }) => {
        const response = await executeAction(apiClient, credentials, connectorId, 'whoAmI', {});

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ status: 'ok', connector_id: connectorId });
        expect(await callsTo(control, ME)).toHaveLength(1);
        expect(await callsTo(control, TOKEN)).toHaveLength(0);
      }
    );
  }
);
