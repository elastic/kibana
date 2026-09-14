/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServer } from 'http';
import { setTimeout as delay } from 'timers/promises';
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
} from '../../../common/service_account_test_utils';

apiTest.describe(
  'Workflow service-account token refresh',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest.setTimeout(600_000);
    for (const firstAfterExpiry of ['elasticsearch', 'kibana'] as const) {
      apiTest(
        `keeps the bound identity when ${firstAfterExpiry} is called first after expiry`,
        async ({ apiClient, samlAuth, config: { organizationId, projectType } }) => {
          if (!organizationId || !projectType) throw new Error('UIAM project context is required');
          const delayCount = process.env.UIAM_EPHEMERAL_TOKEN_TTL === 'PT1M' ? 2 : 8;
          const server = createServer(async (_request, response) => {
            await delay(40_000);
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ waited: true }));
          });
          await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
          const address = server.address();
          if (!address || typeof address === 'string') throw new Error('Expected TCP address');
          const testId = uniqueTestId('refresh-native-sa');
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
              yaml: `name: Service-account expiry and loopback proof
enabled: true
settings:
  run_as: ${serviceAccount.id}
triggers:
  - type: manual
steps:
  - name: before_expiry
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
${Array.from(
  { length: delayCount },
  (_, index) => `  - name: outlive_token_${index}
    type: http
    with:
      method: GET
      url: http://127.0.0.1:${address.port}/delay
`
).join('')}${(firstAfterExpiry === 'elasticsearch'
                ? ['after_expiry', 'kibana_identity']
                : ['kibana_identity', 'after_expiry']
              )
                .map(
                  (stepId) => `  - name: ${stepId}
    type: ${stepId === 'after_expiry' ? 'elasticsearch' : 'kibana'}.request
    with:
      method: GET
      path: ${stepId === 'after_expiry' ? '/_security/_authenticate' : '/internal/security/me'}
`
                )
                .join('')}
`,
            });
            const executionId = await runWorkflow({ apiClient, headers, workflowId });
            const execution = await waitForExecution({
              apiClient,
              headers,
              executionId,
              timeout: delayCount * 40_000 + 60_000,
            });
            expect(execution.status, JSON.stringify(execution)).toBe('completed');
            for (const stepId of ['before_expiry', 'after_expiry', 'kibana_identity']) {
              const step = execution.stepExecutions.find((item) => item.stepId === stepId);
              expect(step?.status).toBe('completed');
              expect(JSON.stringify(step?.output)).toContain(serviceAccount.id);
            }
            expect(execution.effectiveIdentity).toBe(serviceAccount.id);
            const persisted = await apiClient.get(`/api/workflows/executions/${executionId}`, {
              headers,
              responseType: 'json',
            });
            expect(persisted).toHaveStatusCode(200);
            expect(persisted.body.effectiveIdentity).toBe(serviceAccount.id);
          } finally {
            await deleteWorkflow({ apiClient, headers, workflowId });
            await uiam.cleanup();
            await new Promise<void>((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve()))
            );
          }
        }
      );
    }
  }
);
