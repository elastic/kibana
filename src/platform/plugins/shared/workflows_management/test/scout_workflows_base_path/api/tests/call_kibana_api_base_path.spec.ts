/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { isTerminalStatus } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { waitForConditionOrThrow } from '../../../scout_workflows_ui/common/utils/wait_for_condition';

const WORKFLOW_YAML = `
name: callKibanaApi base path regression
enabled: true
triggers:
  - type: manual
steps:
  - name: assign_alert
    type: security.assignAlert
    with:
      alert_ids:
        - "does-not-exist-repro"
      assignees_to_add:
        - "elastic"
`;

apiTest.describe(
  'callKibanaApi with a configured server base path',
  { tag: '@local-stateful-classic' },
  () => {
    let adminCredentials: RoleApiCredentials;
    let workflowId: string | undefined;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      if (workflowId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/workflows/workflow/${workflowId}?force=true`,
        });
      }
    });

    apiTest('executes a custom step that calls a Kibana API', async ({ apiClient }) => {
      const headers = {
        ...adminCredentials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      };
      const createResponse = await apiClient.post('api/workflows/workflow', {
        headers,
        body: JSON.stringify({ yaml: WORKFLOW_YAML }),
      });
      expect(createResponse).toHaveStatusCode(200);
      workflowId = createResponse.body.id;

      const runResponse = await apiClient.post(`api/workflows/workflow/${workflowId}/run`, {
        headers,
        body: JSON.stringify({ inputs: {} }),
      });
      expect(runResponse).toHaveStatusCode(200);

      const execution = await waitForConditionOrThrow({
        action: async () => {
          const response = await apiClient.get(
            `api/workflows/executions/${runResponse.body.workflowExecutionId}`,
            {
              headers,
            }
          );
          expect(response).toHaveStatusCode(200);
          return response.body as {
            status?: ExecutionStatus;
            error?: { message?: string };
          };
        },
        condition: ({ status }) => status !== undefined && isTerminalStatus(status),
        interval: 1000,
        timeout: 30_000,
        errorMessage: ({ status }) =>
          `Workflow did not terminate within 30 seconds (last status: ${status})`,
      });

      expect(execution.status, execution.error?.message).toBe(ExecutionStatus.COMPLETED);
    });
  }
);
