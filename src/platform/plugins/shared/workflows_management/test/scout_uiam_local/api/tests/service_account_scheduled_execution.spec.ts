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
  uniqueTestId,
  waitForScheduledExecution,
} from '../../common/service_account_test_utils';

apiTest.describe(
  '[NON-MKI] Scheduled workflow service-account execution',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(120_000);

    apiTest(
      'queries Elasticsearch as the bound service account',
      async ({ apiClient, esClient, samlAuth, config: { organizationId, projectType } }) => {
        if (!organizationId || !projectType) {
          throw new Error('UIAM organization and project type are required');
        }

        const testId = uniqueTestId('scheduled-native-sa');
        const workflowId = `${testId}-workflow`;
        const indexName = `${testId}-index`;
        const proofId = `${testId}-proof`;
        const expectedMessage = 'Scheduled workflow queried the seeded document';
        const admin = await samlAuth.asInteractiveUser('admin');
        const headers = createWorkflowHeaders(admin.cookieHeader, testId);
        const uiam = await createUiamServiceAccountContext({ organizationId, projectType });

        try {
          const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
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
              name: 'Scheduled native service-account E2E',
              indexName,
              proofId,
              serviceAccountId: serviceAccount.id,
              scheduled: true,
            }),
          });

          const execution = await waitForScheduledExecution({
            apiClient,
            headers,
            workflowId,
          });

          expect(execution.status, JSON.stringify(execution)).toBe('completed');
          expect(execution.effectiveIdentity).toBe(serviceAccount.id);
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
