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
  expectReadOnlyFailure,
  readStep,
  writeStep,
} from '../fixtures/service_account_permissions';
import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: approval/resume permissions',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
    });
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);

    apiTest(
      'retains read-only permissions after approval by an administrator',
      async ({ apiClient, requestAuth, esClient }) => {
        apiTest.setTimeout(120_000);
        const { readOnlyAccountId, dataIndex, create, run, wait, resume } = getContext();
        const admin = await requestAuth.getApiKey('admin');
        const requestHeaders = {
          ...admin.apiKeyHeader,
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        };
        const yaml = workflowYaml(
          readOnlyAccountId,
          readStep(dataIndex, 'before_approval') +
            waitStep +
            authenticationStep +
            readStep(dataIndex) +
            writeStep(dataIndex, 'forbidden-resume')
        );
        const id = await create(apiClient, yaml, requestHeaders);
        const executionId = await run(apiClient, id, requestHeaders);
        const paused = await wait(apiClient, executionId, 'waiting_for_input', requestHeaders);
        expect(
          paused.stepExecutions?.find((step) => step.stepId === 'before_approval')?.status
        ).toBe('completed');
        await resume(
          apiClient,
          {
            id,
            yaml,
            executionId,
            stepExecutionId: paused.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          },
          requestHeaders
        );
        const execution = await wait(apiClient, executionId, 'failed', requestHeaders);
        expectReadOnlyFailure(execution, readOnlyAccountId);
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-resume' })).toBe(false);
      }
    );
  }
);
