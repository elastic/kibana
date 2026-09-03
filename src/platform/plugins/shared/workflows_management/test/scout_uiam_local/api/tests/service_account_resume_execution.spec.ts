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
  getExecution,
  runWorkflow,
  uniqueTestId,
  waitForExecution,
} from '../../common/service_account_test_utils';

apiTest.describe(
  '[NON-MKI] Resumed workflow service-account execution',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(120_000);

    apiTest(
      'records the Elasticsearch identity before and after waitForInput',
      async ({ apiClient, log, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }

        const testId = uniqueTestId('resume-native-sa');
        const workflowId = `${testId}-workflow`;
        const admin = await samlAuth.asInteractiveUser('admin');
        const headers = createWorkflowHeaders(admin.cookieHeader, testId);
        const uiam = await createUiamServiceAccountContext({ organizationId, projectType });

        try {
          const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
          await createWorkflow({
            apiClient,
            headers,
            workflowId,
            yaml: `name: Resumed native service-account E2E
description: Probes credential continuity across waitForInput
enabled: true
settings:
  run_as: ${serviceAccount.id}
triggers:
  - type: manual
steps:
  - name: authenticate_before_wait
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
  - name: wait_for_input
    type: waitForInput
    with:
      message: Resume the service-account workflow
  - name: authenticate_after_wait
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`,
          });

          const executionId = await runWorkflow({ apiClient, headers, workflowId });
          await expect
            .poll(
              async () => {
                const execution = await getExecution({ apiClient, headers, executionId });
                return execution.status;
              },
              { timeout: 30_000 }
            )
            .toMatch(/^waiting/);

          const resumeResponse = await apiClient.post(
            `/api/workflows/executions/${encodeURIComponent(executionId)}/resume`,
            {
              headers,
              responseType: 'json',
              body: { input: { approved: true } },
            }
          );
          expect(resumeResponse).toHaveStatusCode(200);

          const execution = await waitForExecution({
            apiClient,
            headers,
            executionId,
            timeout: 90_000,
          });
          expect(execution.status, JSON.stringify(execution)).toBe('completed');
          expect(execution.effectiveIdentity).toBe(serviceAccount.id);

          const beforeOutput = execution.stepExecutions.find(
            ({ stepId }) => stepId === 'authenticate_before_wait'
          )?.output;
          const afterOutput = execution.stepExecutions.find(
            ({ stepId }) => stepId === 'authenticate_after_wait'
          )?.output;
          const beforeOutputText = JSON.stringify(beforeOutput);
          const afterOutputText = JSON.stringify(afterOutput);

          expect(beforeOutputText).toContain(serviceAccount.id);
          expect(afterOutputText).toContain('authentication_type');
          log.info(
            `RESULT resume_retained_service_account=${afterOutputText.includes(
              serviceAccount.id
            )} before=${beforeOutputText} after=${afterOutputText}`
          );
        } finally {
          await deleteWorkflow({ apiClient, headers, workflowId });
          await uiam.cleanup();
        }
      }
    );
  }
);
