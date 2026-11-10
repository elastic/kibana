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

import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: resume',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(setup);

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    apiTest('resumes with the original service account', async ({ apiClient }) => {
      const { accountId, wait, expectAccount, pause, resume } = getContext();

      apiTest.setTimeout(120_000);
      const paused = await pause(apiClient);
      await resume(apiClient, paused);
      expectAccount(await wait(apiClient, paused.executionId), accountId);
    });

    apiTest(
      'runs and resumes a bound workflow using API-key credentials',
      async ({ apiClient, requestAuth }) => {
        apiTest.setTimeout(120_000);
        const { accountId, create, run, wait, resume, expectAccount } = getContext();
        const commonHeaders = {
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
          'elastic-api-version': '2023-10-31',
        };
        const admin = await requestAuth.getApiKey('admin');
        const executor = await requestAuth.getApiKeyForCustomRole({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        });
        const executorHeaders = { ...commonHeaders, ...executor.apiKeyHeader };
        const yaml = workflowYaml(
          accountId,
          authenticationStep.replace('name: authenticate', 'name: before_approval') +
            waitStep +
            authenticationStep
        );
        const id = await create(apiClient, yaml, { ...commonHeaders, ...admin.apiKeyHeader });
        const executionId = await run(apiClient, id, executorHeaders);
        const paused = await wait(apiClient, executionId, 'waiting_for_input', executorHeaders);
        const approval = paused.stepExecutions?.find((step) => step.stepId === 'approval');
        expect(approval?.id).toBeDefined();
        expect(paused.effectiveIdentity).toStrictEqual({ type: 'service_account', id: accountId });
        expect(
          JSON.stringify(
            paused.stepExecutions?.find((step) => step.stepId === 'before_approval')?.output
          )
        ).toContain(accountId);
        await resume(
          apiClient,
          { id, yaml, executionId, stepExecutionId: approval?.id },
          executorHeaders
        );
        const completed = await wait(apiClient, executionId, 'completed', executorHeaders);
        expectAccount(completed, accountId);
        expect(completed.executedBy).toBe(paused.executedBy);
        expect(completed.stepExecutions?.find((step) => step.stepId === 'approval')?.status).toBe(
          'completed'
        );
      }
    );

    apiTest('fails resume after rebind without executing the next step', async ({ apiClient }) => {
      const { headers, accountId, otherAccountId, wait, pause, resume } = getContext();

      apiTest.setTimeout(120_000);
      const paused = await pause(apiClient);
      const update = await apiClient.put(`api/workflows/workflow/${paused.id}`, {
        headers,
        body: { yaml: paused.yaml.replace(accountId, otherAccountId) },
        responseType: 'json',
      });
      expect(update, JSON.stringify(update.body)).toHaveStatusCode(200);
      await resume(apiClient, paused);
      const execution = await wait(apiClient, paused.executionId, 'failed');
      expect(execution.error?.message).toContain('expected service account');
      expect(typeof execution.finishedAt).toBe('string');
      const approval = execution.stepExecutions?.find((step) => step.stepId === 'approval');
      expect(approval?.status).toBe('failed');
      expect(typeof approval?.finishedAt).toBe('string');
      expect(approval?.error?.type).toBe('ServiceAccountExecutionError');
      expect(
        execution.stepExecutions?.some(
          (step) => step.stepId === 'authenticate' && step.status === 'completed'
        )
      ).toBe(false);
    });

    apiTest(
      'reports a resume identity failure to Task Manager as a user error',
      async ({ apiClient }) => {
        const { headers, accountId, otherAccountId, wait, pause, resume } = getContext();

        apiTest.setTimeout(120_000);
        // Task Manager resets these counters 30s after the last reset, so the test resets them
        // right before resuming and reads them inside that window.
        const getResumeTaskMetrics = async (reset = false) => {
          const response = await apiClient.get(`api/task_manager/metrics?reset=${reset}`, {
            headers,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          const metrics = response.body.metrics?.task_run?.value?.by_type?.['workflow:resume'];
          return {
            total: Number(metrics?.total ?? 0),
            frameworkErrors: Number(metrics?.framework_errors ?? 0),
          };
        };

        const paused = await pause(apiClient);
        const update = await apiClient.put(`api/workflows/workflow/${paused.id}`, {
          headers,
          body: { yaml: paused.yaml.replace(accountId, otherAccountId) },
          responseType: 'json',
        });
        expect(update, JSON.stringify(update.body)).toHaveStatusCode(200);
        await getResumeTaskMetrics(true);
        await resume(apiClient, paused);
        const execution = await wait(apiClient, paused.executionId, 'failed');
        expect(execution.error?.type).toBe('ServiceAccountExecutionError');

        await expect
          .poll(async () => (await getResumeTaskMetrics()).total, { timeout: 20_000 })
          .toBeGreaterThan(0);
        // Identity failures are caused by account configuration, so they must not burn the
        // Task Manager framework-error SLO.
        expect((await getResumeTaskMetrics()).frameworkErrors).toBe(0);
      }
    );

    for (const continuation of ['timer', 'retry'] as const) {
      apiTest(
        `SA continuation audit: ${continuation} retains the bound identity`,
        async ({ apiClient }) => {
          const { accountId, create, run, wait, expectAccount } = getContext();

          apiTest.setTimeout(120_000);
          const delayedStep =
            continuation === 'timer'
              ? `  - name: delay
    type: wait
    with:
      duration: 8s
`
              : `  - name: expected_failure
    type: elasticsearch.request
    with:
      method: GET
      path: /cp2-nonexistent-${Date.now()}/_doc/missing
    on-failure:
      retry:
        max-attempts: 1
        delay: 8s
      continue: true
`;
          const id = await create(
            apiClient,
            workflowYaml(accountId, delayedStep + authenticationStep)
          );
          const executionId = await run(apiClient, id);
          await wait(apiClient, executionId, 'waiting');
          expectAccount(await wait(apiClient, executionId), accountId);
        }
      );
    }
  }
);
