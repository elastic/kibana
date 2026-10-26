/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { createServiceAccountSuite, workflowYaml } from '../fixtures/service_account_suite';

// The rule runs every minute; allow for the first run plus Task Manager polling.
const ALERT_EXECUTION_TIMEOUT_MS = 100_000;
const TEST_TIMEOUT_MS = ALERT_EXECUTION_TIMEOUT_MS + 50_000;

apiTest.describe(
  '[NON-MKI] Workflow service accounts: alert trigger',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(setup);

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    apiTest(
      'alert-triggered execution uses its service account',
      async ({ apiClient, esClient }) => {
        const { headers, accountId, create, wait, expectAccount } = getContext();

        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const sourceIndex = `cp2-alert-source-${Date.now()}`;
        await esClient.index({
          index: sourceIndex,
          document: { '@timestamp': new Date().toISOString() },
          refresh: 'wait_for',
        });
        const id = await create(
          apiClient,
          workflowYaml(accountId).replace('  - type: manual', '  - type: alert')
        );
        const rule = await apiClient.post('api/alerting/rule', {
          headers,
          body: {
            name: `cp2-alert-${id}`,
            rule_type_id: '.es-query',
            consumer: 'stackAlerts',
            schedule: { interval: '1m' },
            params: {
              searchType: 'esQuery',
              index: [sourceIndex],
              timeField: '@timestamp',
              esQuery: JSON.stringify({ query: { match_all: {} } }),
              size: 0,
              threshold: [0],
              thresholdComparator: '>=',
              timeWindowSize: 1,
              timeWindowUnit: 'd',
            },
            actions: [
              {
                id: 'system-connector-.workflows',
                params: {
                  subAction: 'run',
                  subActionParams: { workflowId: id, summaryMode: true },
                },
              },
            ],
          },
          responseType: 'json',
        });
        expect(rule, JSON.stringify(rule.body)).toHaveStatusCode(200);
        try {
          const list = async (): Promise<WorkflowExecutionDto[]> => {
            const response = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
              headers,
              responseType: 'json',
            });
            expect(response).toHaveStatusCode(200);
            return response.body.results as WorkflowExecutionDto[];
          };
          await expect
            .poll(async () => (await list()).length, { timeout: ALERT_EXECUTION_TIMEOUT_MS })
            .toBeGreaterThan(0);
          const [execution] = await list();
          expect(execution.triggeredBy).toBe('alert');
          expectAccount(await wait(apiClient, execution.id), accountId);
        } finally {
          await apiClient.delete(`api/alerting/rule/${rule.body.id}`, { headers });
          await esClient.indices.delete({ index: sourceIndex }, { ignore: [404] });
        }
      }
    );
  }
);
