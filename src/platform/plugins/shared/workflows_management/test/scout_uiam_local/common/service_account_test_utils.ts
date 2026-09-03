/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { Agent, fetch } from 'undici';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_ORGANIZATION_ID,
  MOCK_IDP_UIAM_PROJECT_ID,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import type { WorkflowExecutionDto } from '@kbn/workflows';

export interface TestServiceAccount {
  id: string;
  name: string;
}

export interface UiamServiceAccountContext {
  createServiceAccount(name: string): Promise<TestServiceAccount>;
  cleanup(): Promise<void>;
}

interface CreateUiamServiceAccountContextOptions {
  organizationId: string;
  projectType: string;
}

interface WorkflowRequestOptions {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  workflowId: string;
}

interface ElasticsearchWorkflowYamlOptions {
  name: string;
  indexName: string;
  proofId: string;
  serviceAccountId?: string;
  scheduled?: boolean;
}

const TERMINAL_EXECUTION_STATUSES = new Set([
  'completed',
  'failed',
  'cancelled',
  'timed_out',
  'skipped',
]);

const extractAttributeValue = (xmlDocument: string, attributeName: string): string => {
  const [, attributeValue] =
    xmlDocument.match(
      new RegExp(
        `Name="${attributeName}"[\\s\\S]*?<saml:AttributeValue[^>]*>([\\s\\S]*?)<\\/saml:AttributeValue>`
      )
    ) ?? [];
  if (!attributeValue) {
    throw new Error(`Attribute ${attributeName} isn't present in the SAML response.`);
  }
  return attributeValue.trim();
};

const ensureFetchStatus = async (
  response: Awaited<ReturnType<typeof fetch>>,
  expectedStatuses: readonly number[]
): Promise<void> => {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`UIAM returned HTTP ${response.status}: ${await response.text()}`);
  }
};

export const createUiamServiceAccountContext = async ({
  organizationId,
  projectType,
}: CreateUiamServiceAccountContextOptions): Promise<UiamServiceAccountContext> => {
  const samlResponse = await createSAMLResponse({
    username: '1234567890',
    email: 'elastic_admin@elastic.co',
    roles: ['admin'],
    serverless: {
      uiamEnabled: true,
      organizationId,
      projectType,
    },
  });
  const accessToken = extractAttributeValue(
    Buffer.from(samlResponse, 'base64').toString('utf-8'),
    MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
  );
  const dispatcher = new Agent({
    connect: {
      ca: readFileSync(CA_CERT_PATH),
      cert: readFileSync(KBN_CERT_PATH),
      key: readFileSync(KBN_KEY_PATH),
    },
  });
  const createdServiceAccountIds: string[] = [];

  return {
    createServiceAccount: async (name: string): Promise<TestServiceAccount> => {
      const response = await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/service-accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
        },
        body: JSON.stringify({
          name,
          type: 'project',
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
          assumable_by: [
            {
              type: 'project-service-account',
              organization_id: MOCK_IDP_UIAM_ORGANIZATION_ID,
              project_type: 'elasticsearch',
              project_id: MOCK_IDP_UIAM_PROJECT_ID,
            },
          ],
        }),
        dispatcher,
      });
      const body = (await response.json()) as { id?: string };
      if (response.status !== 200 || !body.id) {
        throw new Error(
          `Failed to create UIAM service account: ${response.status} ${JSON.stringify(body)}`
        );
      }
      createdServiceAccountIds.push(body.id);
      return { id: body.id, name };
    },
    cleanup: async (): Promise<void> => {
      try {
        for (const serviceAccountId of createdServiceAccountIds.reverse()) {
          const response = await fetch(
            `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/service-accounts/${serviceAccountId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
              },
              dispatcher,
            }
          );
          // Project admins can create test accounts in the current UIAM image, but direct
          // deletion is denied. Scout destroys the disposable UIAM store with the stack.
          await ensureFetchStatus(response, [200, 204, 403, 404]);
        }
      } finally {
        await dispatcher.close();
      }
    },
  };
};

export const createWorkflowHeaders = (
  cookieHeader: Record<string, string>,
  xsrf: string
): Record<string, string> => ({
  ...cookieHeader,
  'elastic-api-version': '2023-10-31',
  'kbn-xsrf': xsrf,
  'x-elastic-internal-origin': 'Kibana',
});

export const createWorkflow = async ({
  apiClient,
  headers,
  workflowId,
  yaml,
}: WorkflowRequestOptions & { yaml: string }): Promise<void> => {
  const response = await apiClient.post('/api/workflows/workflow', {
    headers,
    responseType: 'json',
    body: { id: workflowId, yaml },
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to create workflow: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
};

export const updateWorkflow = async ({
  apiClient,
  headers,
  workflowId,
  yaml,
}: WorkflowRequestOptions & { yaml: string }): Promise<void> => {
  const response = await apiClient.put(`/api/workflows/workflow/${workflowId}`, {
    headers,
    responseType: 'json',
    body: { yaml },
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to update workflow: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
};

export const runWorkflow = async ({
  apiClient,
  headers,
  workflowId,
}: WorkflowRequestOptions): Promise<string> => {
  const response = await apiClient.post(`/api/workflows/workflow/${workflowId}/run`, {
    headers,
    responseType: 'json',
    body: { inputs: {} },
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to run workflow: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return (response.body as { workflowExecutionId: string }).workflowExecutionId;
};

export const getWorkflow = async ({
  apiClient,
  headers,
  workflowId,
}: WorkflowRequestOptions): Promise<{ yaml: string }> => {
  const response = await apiClient.get(`/api/workflows/workflow/${workflowId}`, {
    headers,
    responseType: 'json',
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to get workflow: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body as { yaml: string };
};

export const deleteWorkflow = async ({
  apiClient,
  headers,
  workflowId,
}: WorkflowRequestOptions): Promise<void> => {
  const updateResponse = await apiClient.put(
    `/api/workflows/workflow/${encodeURIComponent(workflowId)}`,
    {
      headers,
      responseType: 'json',
      body: { enabled: false },
    }
  );
  if (![200, 404].includes(updateResponse.statusCode)) {
    throw new Error(
      `Failed to disable workflow before deletion: ${updateResponse.statusCode} ${JSON.stringify(
        updateResponse.body
      )}`
    );
  }

  const deadline = Date.now() + 30_000;
  let response;
  do {
    response = await apiClient.delete(
      `/api/workflows/workflow/${encodeURIComponent(workflowId)}?force=true`,
      { headers, responseType: 'json' }
    );
    if ([200, 404].includes(response.statusCode)) {
      return;
    }
    if (response.statusCode !== 409) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  } while (Date.now() < deadline);

  throw new Error(
    `Failed to delete workflow: ${response.statusCode} ${JSON.stringify(response.body)}`
  );
};

export const getExecution = async ({
  apiClient,
  headers,
  executionId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  executionId: string;
}): Promise<WorkflowExecutionDto> => {
  const response = await apiClient.get(
    `/api/workflows/executions/${encodeURIComponent(executionId)}?includeOutput=true`,
    { headers, responseType: 'json' }
  );
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to get execution: ${response.statusCode} ${JSON.stringify(response.body)}`
    );
  }
  return response.body as WorkflowExecutionDto;
};

export const waitForExecution = async ({
  apiClient,
  headers,
  executionId,
  status,
  timeout = 30_000,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  executionId: string;
  status?: string;
  timeout?: number;
}): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + timeout;
  let execution: WorkflowExecutionDto | undefined;

  while (Date.now() < deadline) {
    execution = await getExecution({ apiClient, headers, executionId });
    if (status ? execution.status === status : TERMINAL_EXECUTION_STATUSES.has(execution.status)) {
      return execution;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `Execution ${executionId} did not reach ${status ?? 'a terminal status'}; last status was ${
      execution?.status ?? 'unknown'
    }`
  );
};

export const waitForScheduledExecution = async ({
  apiClient,
  headers,
  workflowId,
  timeout = 90_000,
}: WorkflowRequestOptions & { timeout?: number }): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const response = await apiClient.get(
      `/api/workflows/workflow/${workflowId}/executions?size=20&page=1`,
      { headers, responseType: 'json' }
    );
    if (response.statusCode !== 200) {
      throw new Error(
        `Failed to list workflow executions: ${response.statusCode} ${JSON.stringify(
          response.body
        )}`
      );
    }
    const { results } = response.body as { results: WorkflowExecutionDto[] };
    const scheduledExecution = results.find(({ triggeredBy }) => triggeredBy === 'scheduled');
    if (scheduledExecution?.status === 'completed') {
      return getExecution({
        apiClient,
        headers,
        executionId: scheduledExecution.id,
      });
    }
    if (scheduledExecution && TERMINAL_EXECUTION_STATUSES.has(scheduledExecution.status)) {
      return getExecution({
        apiClient,
        headers,
        executionId: scheduledExecution.id,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  throw new Error(`Workflow ${workflowId} did not produce a terminal scheduled execution`);
};

export const getElasticsearchWorkflowYaml = ({
  name,
  indexName,
  proofId,
  serviceAccountId,
  scheduled = false,
}: ElasticsearchWorkflowYamlOptions): string => `name: ${name}
description: Verifies service-account execution against Elasticsearch
enabled: true
${serviceAccountId ? `settings:\n  run_as: ${serviceAccountId}\n` : ''}triggers:
  - type: manual
${scheduled ? '  - type: scheduled\n    with:\n      every: 1m\n' : ''}steps:
  - name: confirm_scoped_execution
    type: console
    with:
      message: Bound service-account execution started as {{ execution.effectiveIdentity }}
  - name: query_service_account_data
    type: elasticsearch.request
    with:
      method: POST
      path: /${indexName}/_search
      body:
        query:
          term:
            proof_id.keyword: ${proofId}
`;

export const uniqueTestId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
