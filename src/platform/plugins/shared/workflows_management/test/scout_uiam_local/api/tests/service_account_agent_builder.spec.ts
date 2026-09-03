/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'module';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  createUiamServiceAccountContext,
  createWorkflow,
  createWorkflowHeaders,
  deleteWorkflow,
  runWorkflow,
  uniqueTestId,
  waitForExecution,
} from '../../common/service_account_test_utils';

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

apiTest.describe(
  '[NON-MKI] Agent Builder workflow service-account execution',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(120_000);

    apiTest(
      'runs the agent as the bound account and probes conversation access',
      async ({ apiClient, log, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }

        const testId = uniqueTestId('agent-native-sa');
        const workflowId = `${testId}-workflow`;
        const admin = await samlAuth.asInteractiveUser('admin');
        const headers = createWorkflowHeaders(admin.cookieHeader, testId);
        const uiam = await createUiamServiceAccountContext({ organizationId, projectType });
        const llmProxy = await createLlmProxy(log);
        let connectorId: string | undefined;

        try {
          const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
          const connectorResponse = await apiClient.post('/api/actions/connector', {
            headers,
            responseType: 'json',
            body: {
              name: `${testId}-connector`,
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

          await createWorkflow({
            apiClient,
            headers,
            workflowId,
            yaml: `name: Native service-account Agent Builder E2E
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
`,
          });

          const executionId = await runWorkflow({ apiClient, headers, workflowId });
          const execution = await waitForExecution({
            apiClient,
            headers,
            executionId,
            timeout: 60_000,
          });

          expect(execution.status, JSON.stringify(execution)).toBe('completed');
          expect(execution.effectiveIdentity).toBe(serviceAccount.id);
          expect(JSON.stringify(execution.stepExecutions)).toContain(
            'Agent Builder accepted the service-account identity'
          );

          const agentStep = execution.stepExecutions.find(
            ({ stepId }) => stepId === 'invoke_agent_builder'
          );
          const conversationId = (agentStep?.output as { conversation_id?: string } | undefined)
            ?.conversation_id;
          if (!conversationId) {
            throw new Error('The ai.agent step did not return a conversation id');
          }
          const conversationResponse = await apiClient.get(
            `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
            { headers, responseType: 'json' }
          );
          log.info(
            `RESULT agent_builder_conversation_access=${conversationResponse.statusCode} conversation=${conversationId}`
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
          await deleteWorkflow({ apiClient, headers, workflowId });
          await uiam.cleanup();
        }
      }
    );
  }
);
