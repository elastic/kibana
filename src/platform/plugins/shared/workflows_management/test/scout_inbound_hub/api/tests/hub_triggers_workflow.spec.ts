/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/api';

import { spaceTest } from '../fixtures';
import {
  createInboundWebhook,
  deleteConnector,
  expectHubTriggersWorkflow,
  INBOUND_HUB_API_KEY_CONNECTOR_ID,
  inboundWebhookWorkflowYaml,
} from '../hub_run';

const HUB_TEST_TIMEOUT_MS = 180_000;

spaceTest.describe('Inbound hub triggers a workflow', { tag: ['@local-stateful-classic'] }, () => {
  const workflowIds: string[] = [];
  let ingestConnectorId: string | undefined;

  spaceTest.setTimeout(HUB_TEST_TIMEOUT_MS);

  spaceTest.afterAll(async ({ apiServices, kbnClient, scoutSpace }) => {
    for (const workflowId of workflowIds) {
      await apiServices.workflowsApi.hardDelete(workflowId);
    }
    if (ingestConnectorId) {
      await deleteConnector(kbnClient, scoutSpace.id, ingestConnectorId);
    }
  });

  spaceTest(
    'a Kibana API key on an events-on in-memory connector runs the workflow',
    async ({ apiClient, apiServices, requestAuth, scoutSpace }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForBuiltInRole('superuser');
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
});
