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
  '[NON-MKI] Workflow service accounts: parent/child execution permissions',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
    });
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);

    apiTest(
      'a read-only child cannot inherit its parent write permissions',
      async ({ apiClient, requestAuth, esClient }) => {
        apiTest.setTimeout(150_000);
        const { accountId, readOnlyAccountId, dataIndex, create, run, wait, resume } = getContext();
        const admin = await requestAuth.getApiKey('admin');
        const headers = {
          ...admin.apiKeyHeader,
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        };
        const childYaml = workflowYaml(
          readOnlyAccountId,
          `${
            waitStep +
            authenticationStep +
            readStep(dataIndex) +
            writeStep(dataIndex, 'forbidden-child')
          }    on-failure:\n      continue: true\n`
        );
        const childId = await create(apiClient, childYaml, headers);
        const parentId = await create(
          apiClient,
          workflowYaml(
            accountId,
            `${writeStep(dataIndex, 'allowed-parent')}  - name: child
    type: workflow.execute
    with:
      workflow-id: ${childId}
      inputs: {}
${authenticationStep}`
          ),
          headers
        );
        const parentExecutionId = await run(apiClient, parentId, headers);
        const parent = await wait(apiClient, parentExecutionId, 'waiting_for_child', headers);
        expect(parent.stepExecutions?.find((step) => step.stepId === 'write')?.status).toBe(
          'completed'
        );
        const childExecutionId = parent.stepExecutions?.find((step) => step.stepId === 'child')
          ?.state?.executionId;
        expect(typeof childExecutionId).toBe('string');
        const child = await wait(apiClient, String(childExecutionId), 'waiting_for_input', headers);
        await resume(
          apiClient,
          {
            id: childId,
            yaml: childYaml,
            executionId: child.id,
            stepExecutionId: child.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          },
          headers
        );
        expectReadOnlyFailure(
          await wait(apiClient, child.id, 'completed', headers),
          readOnlyAccountId
        );
        const completedParent = await wait(apiClient, parentExecutionId, 'completed', headers);
        expect(completedParent.effectiveIdentity).toStrictEqual({
          type: 'service_account',
          id: accountId,
        });
        expect(
          JSON.stringify(
            completedParent.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
          )
        ).toContain(accountId);
        expect(await esClient.exists({ index: dataIndex, id: 'allowed-parent' })).toBe(true);
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-child' })).toBe(false);
      }
    );
  }
);
