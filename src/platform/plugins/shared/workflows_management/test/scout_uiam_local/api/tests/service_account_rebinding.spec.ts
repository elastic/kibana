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
  getElasticsearchWorkflowYaml,
  runWorkflow,
  uniqueTestId,
  updateWorkflow,
  waitForExecution,
} from '../../common/service_account_test_utils';

apiTest.describe(
  '[NON-MKI] Workflow service-account rebinding',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(90_000);

    apiTest(
      'uses the replacement account on the next run',
      async ({ apiClient, esClient, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }

        const testId = uniqueTestId('rebind-native-sa');
        const workflowId = `${testId}-workflow`;
        const indexName = `${testId}-index`;
        const proofId = `${testId}-proof`;
        const expectedMessage = 'Rebound workflow queried the seeded document';
        const admin = await samlAuth.asInteractiveUser('admin');
        const headers = createWorkflowHeaders(admin.cookieHeader, testId);
        const uiam = await createUiamServiceAccountContext({ organizationId, projectType });

        try {
          const originalAccount = await uiam.createServiceAccount(`${testId}-original`);
          const replacementAccount = await uiam.createServiceAccount(`${testId}-replacement`);
          await esClient.index({
            index: indexName,
            id: proofId,
            document: { proof_id: proofId, message: expectedMessage },
            refresh: 'wait_for',
          });
          await createWorkflow({
            apiClient,
            headers,
            workflowId,
            yaml: getElasticsearchWorkflowYaml({
              name: 'Native service-account rebinding E2E',
              indexName,
              proofId,
              serviceAccountId: originalAccount.id,
            }),
          });
          await updateWorkflow({
            apiClient,
            headers,
            workflowId,
            yaml: getElasticsearchWorkflowYaml({
              name: 'Native service-account rebinding E2E',
              indexName,
              proofId,
              serviceAccountId: replacementAccount.id,
            }),
          });

          const executionId = await runWorkflow({ apiClient, headers, workflowId });
          const execution = await waitForExecution({ apiClient, headers, executionId });

          expect(execution.status, JSON.stringify(execution)).toBe('completed');
          expect(execution.effectiveIdentity).toBe(replacementAccount.id);
          expect(execution.effectiveIdentity).not.toBe(originalAccount.id);
          expect(JSON.stringify(execution.stepExecutions)).toContain(expectedMessage);
        } finally {
          await deleteWorkflow({ apiClient, headers, workflowId });
          await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
          await uiam.cleanup();
        }
      }
    );
  }
);
