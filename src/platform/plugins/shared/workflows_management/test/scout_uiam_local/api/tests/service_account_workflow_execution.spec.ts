/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
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
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

interface LlmProxy {
  getPort(): number;
  intercept(options: {
    name: string;
    when: (body: { messages: Array<{ role: string; content?: unknown }> }) => boolean;
    responseMock: unknown;
  }): { completeAfterIntercept(): void };
  waitForAllInterceptorsToHaveBeenCalled(): Promise<void>;
  close(): void;
}

const loadModule = createRequire(__filename);
const { createLlmProxy, createToolCallMessage } = loadModule('@kbn/ftr-llm-proxy') as {
  createLlmProxy: (log: unknown) => Promise<LlmProxy>;
  createToolCallMessage: (name: string, args: Record<string, unknown>) => unknown;
};

const WORKFLOW_ID = 'native-service-account-api-e2e';

const createServiceAccount = async ({
  accessToken,
  dispatcher,
  name,
}: {
  accessToken: string;
  dispatcher: Agent;
  name: string;
}): Promise<{ id: string }> => {
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
          // The shared local Kibana client certificate authenticates to UIAM with this
          // fixed project identity, independently of the tested serverless solution.
          organization_id: MOCK_IDP_UIAM_ORGANIZATION_ID,
          project_type: 'elasticsearch',
          project_id: MOCK_IDP_UIAM_PROJECT_ID,
        },
      ],
    }),
    dispatcher,
  });
  const serviceAccount = (await response.json()) as { id: string };
  expect(response.status, JSON.stringify(serviceAccount)).toBe(200);
  return serviceAccount;
};

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

apiTest.describe(
  '[NON-MKI] Saved workflow execution with a native service-account binding',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(120_000);

    apiTest(
      'runs manual and scheduled executions as the bound service account',
      async ({ apiClient, esClient, log, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }
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
        const uiamAccessToken = extractAttributeValue(
          Buffer.from(samlResponse, 'base64').toString('utf-8'),
          MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
        );
        const uiamDispatcher = new Agent({
          connect: {
            ca: readFileSync(CA_CERT_PATH),
            cert: readFileSync(KBN_CERT_PATH),
            key: readFileSync(KBN_KEY_PATH),
          },
        });
        const serviceAccount = await createServiceAccount({
          accessToken: uiamAccessToken,
          dispatcher: uiamDispatcher,
          name: `workflow-api-e2e-${Date.now()}`,
        });
        const replacementServiceAccount = await createServiceAccount({
          accessToken: uiamAccessToken,
          dispatcher: uiamDispatcher,
          name: `workflow-api-e2e-replacement-${Date.now()}`,
        });

        const exchangeResponse = await fetch(
          `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/service-accounts/${serviceAccount.id}/credentials/_exchange`,
          {
            method: 'POST',
            headers: { 'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET },
            dispatcher: uiamDispatcher,
          }
        );
        const exchangedCredential = (await exchangeResponse.json()) as { token: string };
        expect(exchangeResponse.status, JSON.stringify(exchangedCredential)).toBe(200);

        const authenticateResponse = await fetch(
          `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/authentication/_authenticate?include_role_assignments=true`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${exchangedCredential.token}`,
              'Content-Type': 'application/json',
              'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
            },
            body: JSON.stringify({
              contexts: [
                {
                  type: 'project',
                  project_id: MOCK_IDP_UIAM_PROJECT_ID,
                  project_type: projectType,
                  project_organization_id: organizationId,
                },
              ],
            }),
            dispatcher: uiamDispatcher,
          }
        );
        const authenticatedServiceAccount = await authenticateResponse.json();
        expect(authenticateResponse.status, JSON.stringify(authenticatedServiceAccount)).toBe(200);
        expect(JSON.stringify(authenticatedServiceAccount)).toContain(serviceAccount.id);

        const indexName = `native-sa-workflow-e2e-${Date.now()}`;
        const expectedMessage = 'Queried through a workflow service account';
        await esClient.index({
          index: indexName,
          id: 'service-account-proof',
          document: {
            message: expectedMessage,
            service_account_id: serviceAccount.id,
          },
          refresh: 'wait_for',
        });

        const admin = await samlAuth.asInteractiveUser('admin');
        const headers = {
          ...admin.cookieHeader,
          'elastic-api-version': '2023-10-31',
          'kbn-xsrf': 'native-service-account-api-e2e',
          'x-elastic-internal-origin': 'Kibana',
        };
        const deleteResponse = await apiClient.delete(
          `/api/workflows/workflow/${WORKFLOW_ID}?force=true`,
          { headers, responseType: 'json' }
        );
        expect([200, 404]).toContain(deleteResponse.statusCode);

        const workflowYaml = `name: Native service account API E2E
description: Verifies a saved workflow executes with its authorized UIAM service account
enabled: true
settings:
  run_as: ${serviceAccount.id}
triggers:
  - type: manual
  - type: scheduled
    with:
      every: 1m
steps:
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
            service_account_id.keyword: ${serviceAccount.id}
`;
        const saveResponse = await apiClient.post('/api/workflows/workflow', {
          headers,
          responseType: 'json',
          body: { id: WORKFLOW_ID, yaml: workflowYaml },
        });
        expect(saveResponse).toHaveStatusCode(200);
        expect(saveResponse.body).toMatchObject({ id: WORKFLOW_ID });
        const adminListResponse = await apiClient.get('/internal/security/service_account', {
          headers,
          responseType: 'json',
        });
        expect(adminListResponse).toHaveStatusCode(200);
        expect(JSON.stringify(adminListResponse.body)).toContain(serviceAccount.id);

        const runResponse = await apiClient.post(`/api/workflows/workflow/${WORKFLOW_ID}/run`, {
          headers,
          responseType: 'json',
          body: { inputs: {} },
        });
        expect(runResponse.statusCode, JSON.stringify(runResponse.body)).toBe(200);
        const { workflowExecutionId } = runResponse.body as { workflowExecutionId: string };

        let execution:
          | {
              status: string;
              executedBy?: string;
              effectiveIdentity?: string;
              stepExecutions?: Array<{ output?: unknown }>;
            }
          | undefined;
        await expect
          .poll(
            async () => {
              const executionResponse = await apiClient.get(
                `/api/workflows/executions/${workflowExecutionId}?includeOutput=true`,
                { headers, responseType: 'json' }
              );
              expect(executionResponse).toHaveStatusCode(200);
              execution = executionResponse.body as typeof execution;
              return execution?.status === 'completed' || execution?.status === 'failed';
            },
            { timeout: 30_000 }
          )
          .toBe(true);

        expect(execution?.status, JSON.stringify(execution)).toBe('completed');
        expect(execution?.effectiveIdentity).toBe(serviceAccount.id);
        expect(JSON.stringify(execution?.stepExecutions)).toContain(
          `Bound service-account execution started as ${serviceAccount.id}`
        );
        expect(JSON.stringify(execution?.stepExecutions)).toContain(expectedMessage);

        const editor = await samlAuth.asInteractiveUser('editor');
        const editorHeaders = {
          ...editor.cookieHeader,
          'elastic-api-version': '2023-10-31',
          'kbn-xsrf': 'native-service-account-editor-e2e',
          'x-elastic-internal-origin': 'Kibana',
        };
        const editorListResponse = await apiClient.get('/internal/security/service_account', {
          headers: editorHeaders,
          responseType: 'json',
        });
        expect(editorListResponse).toHaveStatusCode(403);
        const editorViewResponse = await apiClient.get(`/api/workflows/workflow/${WORKFLOW_ID}`, {
          headers: editorHeaders,
          responseType: 'json',
        });
        expect(editorViewResponse).toHaveStatusCode(200);
        const editorMetadataUpdateResponse = await apiClient.put(
          `/api/workflows/workflow/${WORKFLOW_ID}`,
          {
            headers: editorHeaders,
            responseType: 'json',
            body: { description: 'Updated without reauthorizing the bound service account' },
          }
        );
        expect(editorMetadataUpdateResponse).toHaveStatusCode(200);
        const editorYamlUpdateResponse = await apiClient.put(
          `/api/workflows/workflow/${WORKFLOW_ID}`,
          {
            headers: editorHeaders,
            responseType: 'json',
            body: { yaml: workflowYaml },
          }
        );
        expect([403, 500]).toContain(editorYamlUpdateResponse.statusCode);
        const editorRunResponse = await apiClient.post(
          `/api/workflows/workflow/${WORKFLOW_ID}/run`,
          {
            headers: editorHeaders,
            responseType: 'json',
            body: { inputs: {} },
          }
        );
        expect(editorRunResponse.statusCode, JSON.stringify(editorRunResponse.body)).toBe(200);
        const { workflowExecutionId: editorWorkflowExecutionId } = editorRunResponse.body as {
          workflowExecutionId: string;
        };

        let editorExecution: typeof execution;
        await expect
          .poll(
            async () => {
              const executionResponse = await apiClient.get(
                `/api/workflows/executions/${editorWorkflowExecutionId}?includeOutput=true`,
                { headers, responseType: 'json' }
              );
              expect(executionResponse).toHaveStatusCode(200);
              editorExecution = executionResponse.body as typeof editorExecution;
              return (
                editorExecution?.status === 'completed' || editorExecution?.status === 'failed'
              );
            },
            { timeout: 30_000 }
          )
          .toBe(true);

        expect(editorExecution?.status, JSON.stringify(editorExecution)).toBe('completed');
        expect(editorExecution?.executedBy).not.toBe(execution?.executedBy);
        expect(editorExecution?.effectiveIdentity).toBe(serviceAccount.id);
        expect(JSON.stringify(editorExecution?.stepExecutions)).toContain(
          `Bound service-account execution started as ${serviceAccount.id}`
        );
        expect(JSON.stringify(editorExecution?.stepExecutions)).toContain(expectedMessage);

        let scheduledExecutionId: string | undefined;
        await expect
          .poll(
            async () => {
              const executionsResponse = await apiClient.get(
                `/api/workflows/workflow/${WORKFLOW_ID}/executions?size=20&page=1`,
                { headers, responseType: 'json' }
              );
              expect(executionsResponse).toHaveStatusCode(200);
              const { results } = executionsResponse.body as {
                results: Array<{ id: string; status: string; triggeredBy?: string }>;
              };
              const scheduledExecution = results.find(
                ({ triggeredBy }) => triggeredBy === 'scheduled'
              );
              scheduledExecutionId = scheduledExecution?.id;
              return scheduledExecution?.status;
            },
            { timeout: 90_000, intervals: [3_000] }
          )
          .toBe('completed');

        const scheduledExecutionResponse = await apiClient.get(
          `/api/workflows/executions/${scheduledExecutionId}?includeOutput=true`,
          { headers, responseType: 'json' }
        );
        expect(scheduledExecutionResponse).toHaveStatusCode(200);
        expect(scheduledExecutionResponse.body).toMatchObject({
          effectiveIdentity: serviceAccount.id,
        });
        expect(JSON.stringify(scheduledExecutionResponse.body)).toContain(
          `Bound service-account execution started as ${serviceAccount.id}`
        );
        expect(JSON.stringify(scheduledExecutionResponse.body)).toContain(expectedMessage);

        const reboundWorkflowYaml = workflowYaml.replace(
          `run_as: ${serviceAccount.id}`,
          `run_as: ${replacementServiceAccount.id}`
        );
        const rebindResponse = await apiClient.put(`/api/workflows/workflow/${WORKFLOW_ID}`, {
          headers,
          responseType: 'json',
          body: { yaml: reboundWorkflowYaml },
        });
        expect(rebindResponse).toHaveStatusCode(200);
        const reboundRunResponse = await apiClient.post(
          `/api/workflows/workflow/${WORKFLOW_ID}/run`,
          {
            headers,
            responseType: 'json',
            body: { inputs: {} },
          }
        );
        expect(reboundRunResponse).toHaveStatusCode(200);
        const { workflowExecutionId: reboundExecutionId } = reboundRunResponse.body as {
          workflowExecutionId: string;
        };
        let reboundExecution: typeof execution;
        await expect
          .poll(
            async () => {
              const executionResponse = await apiClient.get(
                `/api/workflows/executions/${reboundExecutionId}?includeOutput=true`,
                { headers, responseType: 'json' }
              );
              expect(executionResponse).toHaveStatusCode(200);
              reboundExecution = executionResponse.body as typeof reboundExecution;
              return (
                reboundExecution?.status === 'completed' || reboundExecution?.status === 'failed'
              );
            },
            { timeout: 30_000 }
          )
          .toBe(true);
        expect(reboundExecution?.status, JSON.stringify(reboundExecution)).toBe('completed');
        expect(reboundExecution?.effectiveIdentity).toBe(replacementServiceAccount.id);
        expect(JSON.stringify(reboundExecution?.stepExecutions)).toContain(expectedMessage);

        const llmProxy = await createLlmProxy(log);
        let connectorId: string | undefined;
        try {
          const connectorResponse = await apiClient.post('/api/actions/connector', {
            headers,
            responseType: 'json',
            body: {
              name: 'native-service-account-agent-probe',
              config: {
                apiProvider: 'OpenAI',
                apiUrl: `http://localhost:${llmProxy.getPort()}`,
                defaultModel: 'gpt-4',
              },
              secrets: { apiKey: 'test-api-key' },
              connector_type_id: '.gen-ai',
            },
          });
          expect(connectorResponse).toHaveStatusCode(200);
          connectorId = (connectorResponse.body as { id: string }).id;

          void llmProxy
            .intercept({
              name: 'service-account-conversation-title',
              when: (body) => {
                const systemMessage = body.messages.find(({ role }) => role === 'system');
                return String(systemMessage?.content ?? '').includes(
                  'You are a title-generation utility'
                );
              },
              responseMock: createToolCallMessage('set_title', {
                title: 'Service account conversation',
              }),
            })
            .completeAfterIntercept();
          void llmProxy
            .intercept({
              name: 'service-account-agent-answer',
              when: () => true,
              responseMock: 'Agent Builder accepted the service-account identity',
            })
            .completeAfterIntercept();

          const aiAgentWorkflowYaml = `name: Native service account Agent Builder probe
description: Verifies ai.agent receives the scoped service-account request
enabled: true
settings:
  run_as: ${serviceAccount.id}
triggers:
  - type: manual
steps:
  - name: invoke_agent_builder
    type: ai.agent
    connector-id: ${connectorId}
    create-conversation: true
    with:
      message: Reply with the configured test response
`;
          const updateResponse = await apiClient.put(`/api/workflows/workflow/${WORKFLOW_ID}`, {
            headers,
            responseType: 'json',
            body: { yaml: aiAgentWorkflowYaml },
          });
          expect(updateResponse).toHaveStatusCode(200);

          const aiAgentRunResponse = await apiClient.post(
            `/api/workflows/workflow/${WORKFLOW_ID}/run`,
            {
              headers,
              responseType: 'json',
              body: { inputs: {} },
            }
          );
          expect(aiAgentRunResponse).toHaveStatusCode(200);
          const { workflowExecutionId: aiAgentExecutionId } = aiAgentRunResponse.body as {
            workflowExecutionId: string;
          };

          let aiAgentExecution: typeof execution;
          await expect
            .poll(
              async () => {
                const executionResponse = await apiClient.get(
                  `/api/workflows/executions/${aiAgentExecutionId}?includeOutput=true`,
                  { headers, responseType: 'json' }
                );
                expect(executionResponse).toHaveStatusCode(200);
                aiAgentExecution = executionResponse.body as typeof aiAgentExecution;
                return (
                  aiAgentExecution?.status === 'completed' || aiAgentExecution?.status === 'failed'
                );
              },
              { timeout: 60_000 }
            )
            .toBe(true);

          expect(aiAgentExecution?.status, JSON.stringify(aiAgentExecution)).toBe('completed');
          expect(aiAgentExecution?.effectiveIdentity).toBe(serviceAccount.id);
          expect(JSON.stringify(aiAgentExecution?.stepExecutions)).toContain(
            'Agent Builder accepted the service-account identity'
          );
          const agentStep = aiAgentExecution?.stepExecutions?.find(
            (stepExecution) =>
              (stepExecution as { stepId?: string }).stepId === 'invoke_agent_builder'
          );
          const conversationId = (agentStep?.output as { conversation_id?: string } | undefined)
            ?.conversation_id;
          if (!conversationId) {
            throw new Error('The ai.agent step did not return a conversation id');
          }
          const conversationResponse = await apiClient.get(
            `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
            {
              headers,
              responseType: 'json',
            }
          );
          log.info(
            `Admin access to service-account-owned Agent Builder conversation returned HTTP ${conversationResponse.statusCode}`
          );
          expect([200, 403, 404]).toContain(conversationResponse.statusCode);
          await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
        } finally {
          llmProxy.close();
          if (connectorId) {
            await apiClient.delete(`/api/actions/connector/${encodeURIComponent(connectorId)}`, {
              headers,
              responseType: 'json',
            });
          }
        }
      }
    );
  }
);
