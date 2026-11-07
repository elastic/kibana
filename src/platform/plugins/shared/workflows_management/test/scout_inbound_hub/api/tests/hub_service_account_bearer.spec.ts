/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';

import {
  MOCK_IDP_GATEWAY_SHARED_SECRET,
  MOCK_IDP_UIAM_ORG_ADMIN_API_KEY,
} from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { exchangeUiamServiceAccountToken } from '../exchange_service_account_token';
import { spaceTest } from '../fixtures';
import {
  createInboundWebhook,
  deleteConnector,
  expectHubTriggersWorkflow,
  INBOUND_HUB_API_KEY_CONNECTOR_ID,
  INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID,
  inboundWebhookWorkflowYaml,
} from '../hub_run';

const HUB_TEST_TIMEOUT_MS = 180_000;

const CLIENT_AUTHENTICATION_HEADER = 'x-client-authentication';

const orgAdminHeaders = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};

interface CreatedServiceAccount {
  id: string;
}

const createServiceAccount = async (apiClient: ApiClientFixture): Promise<string> => {
  const response = await apiClient.post<CreatedServiceAccount>(
    'internal/security/service_account',
    {
      headers: orgAdminHeaders,
      body: { name: `inbound-hub-${randomUUID()}`, roles: ['admin'] },
      responseType: 'json',
    }
  );
  expect(response).toHaveStatusCode(200);
  return response.body.id;
};

spaceTest.describe(
  '[NON-MKI] Inbound hub on Serverless',
  { tag: ['@local-serverless-search'] },
  () => {
    const workflowIds: string[] = [];
    const serviceAccountIds: string[] = [];
    let ingestConnectorId: string | undefined;

    spaceTest.setTimeout(HUB_TEST_TIMEOUT_MS);

    spaceTest.afterAll(async ({ apiClient, apiServices, kbnClient, scoutSpace }) => {
      for (const workflowId of workflowIds) {
        await apiServices.workflowsApi.hardDelete(workflowId);
      }
      if (ingestConnectorId) {
        await deleteConnector(kbnClient, scoutSpace.id, ingestConnectorId);
      }
      for (const id of serviceAccountIds) {
        await apiClient.delete(
          `internal/security/service_account/${encodeURIComponent(id)}?force=true`,
          {
            headers: orgAdminHeaders,
          }
        );
      }
    });

    spaceTest(
      'a Kibana API key on an events-on in-memory connector runs the workflow',
      async ({ apiClient, apiServices, requestAuth, scoutSpace }) => {
        const { apiKeyHeader } = await requestAuth.getApiKey('admin');
        const workflow = await apiServices.workflowsApi.create(
          inboundWebhookWorkflowYaml('Inbound hub API key', INBOUND_HUB_API_KEY_CONNECTOR_ID)
        );
        workflowIds.push(workflow.id);
        expect(workflow.valid).toBe(true);

        await expectHubTriggersWorkflow({
          apiClient,
          workflowsApi: apiServices.workflowsApi,
          spaceId: scoutSpace.id,
          connectorId: INBOUND_HUB_API_KEY_CONNECTOR_ID,
          workflowId: workflow.id,
          headers: { ...apiKeyHeader },
        });
      }
    );

    spaceTest(
      'an ingest token on a saved connector runs the workflow',
      async ({ apiClient, apiServices, kbnClient, scoutSpace }) => {
        const { connectorId, ingestToken } = await createInboundWebhook(
          kbnClient,
          scoutSpace.id,
          'inbound-hub-ingest'
        );
        ingestConnectorId = connectorId;

        const workflow = await apiServices.workflowsApi.create(
          inboundWebhookWorkflowYaml('Inbound hub ingest token', connectorId)
        );
        workflowIds.push(workflow.id);
        expect(workflow.valid).toBe(true);

        await expectHubTriggersWorkflow({
          apiClient,
          workflowsApi: apiServices.workflowsApi,
          spaceId: scoutSpace.id,
          connectorId,
          workflowId: workflow.id,
          headers: { Authorization: `Bearer ${ingestToken}` },
        });
      }
    );

    spaceTest(
      'a service account bearer runs the workflow',
      async ({ apiClient, apiServices, samlAuth, scoutSpace }) => {
        await samlAuth.asInteractiveUser('admin');
        const accountId = await createServiceAccount(apiClient);
        serviceAccountIds.push(accountId);
        const token = await exchangeUiamServiceAccountToken(accountId);

        const workflow = await apiServices.workflowsApi.create(
          inboundWebhookWorkflowYaml(
            'Inbound hub service account bearer',
            INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID
          )
        );
        workflowIds.push(workflow.id);
        expect(workflow.valid).toBe(true);

        await expectHubTriggersWorkflow({
          apiClient,
          workflowsApi: apiServices.workflowsApi,
          spaceId: scoutSpace.id,
          connectorId: INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID,
          workflowId: workflow.id,
          headers: {
            Authorization: `Bearer ${token}`,
            [CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
          },
        });
      }
    );
  }
);
