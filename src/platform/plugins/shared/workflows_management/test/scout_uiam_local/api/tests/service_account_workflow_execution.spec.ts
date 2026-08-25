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
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const WORKFLOW_ID = 'native-service-account-api-e2e';

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
      async ({ apiClient, samlAuth, config: { organizationId, projectType } }) => {
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
        const serviceAccountResponse = await fetch(
          `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/service-accounts`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${uiamAccessToken}`,
              'Content-Type': 'application/json',
              'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET,
            },
            body: JSON.stringify({
              name: `workflow-api-e2e-${Date.now()}`,
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
            dispatcher: uiamDispatcher,
          }
        );
        const serviceAccount = (await serviceAccountResponse.json()) as { id: string };
        expect(serviceAccountResponse.status, JSON.stringify(serviceAccount)).toBe(200);

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
`;
        const saveResponse = await apiClient.post('/api/workflows/workflow', {
          headers,
          responseType: 'json',
          body: { id: WORKFLOW_ID, yaml: workflowYaml },
        });
        expect(saveResponse).toHaveStatusCode(200);
        expect(saveResponse.body).toMatchObject({ id: WORKFLOW_ID });

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

        const editor = await samlAuth.asInteractiveUser('editor');
        const editorHeaders = {
          ...editor.cookieHeader,
          'elastic-api-version': '2023-10-31',
          'kbn-xsrf': 'native-service-account-editor-e2e',
          'x-elastic-internal-origin': 'Kibana',
        };
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
      }
    );
  }
);
