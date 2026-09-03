/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

apiTest.describe(
  '[NON-MKI] Workflow service-account authorization',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(90_000);

    apiTest(
      'allows admin binding and editor execution while denying editor rebinding',
      async ({ apiClient, log, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }

        const testId = uniqueTestId('auth-native-sa');
        const workflowId = `${testId}-workflow`;
        const admin = await samlAuth.asInteractiveUser('admin');
        const editor = await samlAuth.asInteractiveUser('editor');
        const adminHeaders = createWorkflowHeaders(admin.cookieHeader, `${testId}-admin`);
        const editorHeaders = createWorkflowHeaders(editor.cookieHeader, `${testId}-editor`);
        const uiam = await createUiamServiceAccountContext({ organizationId, projectType });

        try {
          const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
          const workflowYaml = `name: Native service-account authorization E2E
description: Verifies binding and execution authorization
enabled: true
settings:
  run_as: ${serviceAccount.id}
triggers:
  - type: manual
steps:
  - name: confirm_scoped_execution
    type: console
    with:
      message: Bound execution used {{ execution.effectiveIdentity }}
`;
          await createWorkflow({
            apiClient,
            headers: adminHeaders,
            workflowId,
            yaml: workflowYaml,
          });

          const adminListResponse = await apiClient.get('/internal/security/service_account', {
            headers: adminHeaders,
            responseType: 'json',
          });
          expect(adminListResponse).toHaveStatusCode(200);
          expect(JSON.stringify(adminListResponse.body)).toContain(serviceAccount.id);

          const editorListResponse = await apiClient.get('/internal/security/service_account', {
            headers: editorHeaders,
            responseType: 'json',
          });
          expect(editorListResponse).toHaveStatusCode(403);

          const editorViewResponse = await apiClient.get(`/api/workflows/workflow/${workflowId}`, {
            headers: editorHeaders,
            responseType: 'json',
          });
          expect(editorViewResponse).toHaveStatusCode(200);

          const metadataUpdateResponse = await apiClient.put(
            `/api/workflows/workflow/${workflowId}`,
            {
              headers: editorHeaders,
              responseType: 'json',
              body: { description: 'Updated without changing executable YAML' },
            }
          );
          expect(metadataUpdateResponse).toHaveStatusCode(200);

          const yamlUpdateResponse = await apiClient.put(`/api/workflows/workflow/${workflowId}`, {
            headers: editorHeaders,
            responseType: 'json',
            body: { yaml: workflowYaml },
          });
          log.info(`RESULT editor_yaml_rebind_status=${yamlUpdateResponse.statusCode}`);
          expect([403, 500]).toContain(yamlUpdateResponse.statusCode);

          const executionId = await runWorkflow({
            apiClient,
            headers: editorHeaders,
            workflowId,
          });
          const execution = await waitForExecution({
            apiClient,
            headers: editorHeaders,
            executionId,
          });

          expect(execution.status, JSON.stringify(execution)).toBe('completed');
          expect(execution.effectiveIdentity).toBe(serviceAccount.id);
          expect(JSON.stringify(execution.stepExecutions)).toContain(
            `Bound execution used ${serviceAccount.id}`
          );
        } finally {
          await deleteWorkflow({ apiClient, headers: adminHeaders, workflowId });
          await uiam.cleanup();
        }
      }
    );
  }
);
