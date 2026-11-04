/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID } from '@kbn/connector-specs';
import type { ApiClientFixture, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';

import type { WorkflowsApiService } from '../../scout/common/apis/workflows';
import { waitForConditionOrThrow } from '../../scout/common/utils/wait_for_condition';

/** Registered by the inbound hub test plugin. */
export const INBOUND_HUB_API_KEY_CONNECTOR_ID = 'inbound-hub-api-key';
/** Registered by the inbound hub test plugin. Separate from the API key connector so the two doors do not share a subscription. */
export const INBOUND_HUB_SERVICE_ACCOUNT_CONNECTOR_ID = 'inbound-hub-service-account';

const HUB_API_VERSION = '2023-10-31';
const FIRST_SCHEDULE_TIMEOUT_MS = 20_000;
const RETRY_SCHEDULE_TIMEOUT_MS = 70_000;
const EXECUTION_TIMEOUT_MS = 60_000;

/** Saved inbound webhook plus the one-time ingest token from rotate. */
export const createInboundWebhook = async (
  kbnClient: KbnClient,
  spaceId: string,
  name: string
): Promise<{ connectorId: string; ingestToken: string }> => {
  const created = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}/api/actions/connector`,
    body: {
      name,
      connector_type_id: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
      config: {},
      secrets: { authType: 'none' },
    },
  });
  const connectorId = created.data.id;
  const minted = await kbnClient.request<{ ingest_token?: string }>({
    method: 'POST',
    path: `/s/${spaceId}/internal/actions/connector/${connectorId}/_rotate_event_token`,
  });
  const ingestToken = minted.data.ingest_token;
  if (!ingestToken) {
    throw new Error('Rotate did not return an ingest token');
  }
  return { connectorId, ingestToken };
};

export const deleteConnector = async (
  kbnClient: KbnClient,
  spaceId: string,
  connectorId: string
): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/s/${spaceId}/api/actions/connector/${connectorId}`,
    ignoreErrors: [404],
  });
};

export const inboundWebhookWorkflowYaml = (
  name: string,
  connectorId: string
): string => `name: ${name}
enabled: true
description: Started by a POST to the inbound events hub
triggers:
  - type: inboundWebhook.received
    connector-id: ${connectorId}
steps:
  - name: log_event
    type: console
    with:
      message: Hub accepted an event for ${connectorId}
`;

/**
 * POSTs the public hub and waits until the matching workflow reaches a completed execution.
 * A second POST covers the gap before the new workflow document is visible to trigger lookup.
 */
export const expectHubTriggersWorkflow = async ({
  apiClient,
  workflowsApi,
  spaceId,
  connectorId,
  workflowId,
  headers,
}: {
  apiClient: ApiClientFixture;
  workflowsApi: WorkflowsApiService;
  spaceId: string;
  connectorId: string;
  workflowId: string;
  headers: Record<string, string>;
}): Promise<void> => {
  const path = `s/${spaceId}/api/actions/events/.inboundWebhook/${encodeURIComponent(connectorId)}`;

  const postHub = async () => {
    const response = await apiClient.post(path, {
      headers: {
        'kbn-xsrf': 'true',
        'elastic-api-version': HUB_API_VERSION,
        ...headers,
      },
      body: { source: 'inbound-hub-test' },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(202);
    expect(response.body).toStrictEqual({ ok: true });
  };

  const waitForExecution = (timeout: number) =>
    waitForConditionOrThrow({
      action: () => workflowsApi.getExecutions(workflowId),
      condition: ({ results }) => results.length > 0,
      interval: 2000,
      timeout,
      errorMessage: `Hub accepted the event for connector ${connectorId} but no workflow execution was scheduled`,
    });

  await postHub();
  let scheduled: Awaited<ReturnType<typeof waitForExecution>>;
  try {
    scheduled = await waitForExecution(FIRST_SCHEDULE_TIMEOUT_MS);
  } catch {
    // The workflow document can miss the first lookup. One more POST, then wait out the run.
    await postHub();
    scheduled = await waitForExecution(RETRY_SCHEDULE_TIMEOUT_MS);
  }

  const execution = await workflowsApi.waitForTermination({
    workflowExecutionId: scheduled.results[0].id,
    timeout: EXECUTION_TIMEOUT_MS,
  });
  expect(execution?.status).toBe(ExecutionStatus.COMPLETED);
};
