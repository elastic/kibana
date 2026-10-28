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
import { accountPath, HEADERS } from '../fixtures/bound_workflows';
import {
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

const INTERNAL_HEADERS = { ...HEADERS, 'elastic-api-version': '1' };

/**
 * A user who can read a workflow sees the name of the account it runs as, without being able to
 * read service accounts themselves.
 */
apiTest.describe(
  '[NON-MKI] Workflow service accounts: names for workflow readers',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown } = createServiceAccountSuite();
    let workflowId: string;
    let unboundWorkflowId: string;
    let executionId: string;
    /** Can read workflows and their executions, and nothing in security. */
    let readerHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const { accountId, create, run, wait } = getContext();
      workflowId = await create(apiClient, workflowYaml(accountId));
      executionId = await run(apiClient, workflowId);
      await wait(apiClient, executionId);
      unboundWorkflowId = await create(
        apiClient,
        `name: Unbound workflow
enabled: true
triggers:
  - type: manual
steps:
${waitStep}`
      );

      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { workflowsManagement: ['read'] }, spaces: ['*'] }],
      });
      readerHeaders = { ...cookieHeader, ...INTERNAL_HEADERS };
    });

    apiTest.afterAll(teardown);

    apiTest('names the account a readable workflow is bound to', async ({ apiClient }) => {
      const { accountId } = getContext();

      const response = await apiClient.get(
        `internal/workflows/workflow/${workflowId}/service_account`,
        { headers: readerHeaders, responseType: 'json' }
      );

      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      const { name, ...rest } = response.body.serviceAccount;
      expect(rest).toStrictEqual({ id: accountId, enabled: true, assumable: true });
      expect(name.startsWith('cp2-primary-')).toBe(true);
    });

    apiTest('names the account a readable execution ran as', async ({ apiClient }) => {
      const { accountId } = getContext();

      const response = await apiClient.get(
        `internal/workflows/executions/${executionId}/service_account`,
        { headers: readerHeaders, responseType: 'json' }
      );

      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      expect(response.body.serviceAccount.id).toBe(accountId);
      expect(response.body.serviceAccount.name.startsWith('cp2-primary-')).toBe(true);
    });

    apiTest('reports no account for a workflow that is not bound', async ({ apiClient }) => {
      const response = await apiClient.get(
        `internal/workflows/workflow/${unboundWorkflowId}/service_account`,
        { headers: readerHeaders, responseType: 'json' }
      );

      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ serviceAccount: null });
    });

    apiTest(
      'still refuses the reader the service account directory itself',
      async ({ apiClient }) => {
        const { accountId } = getContext();

        const response = await apiClient.get(accountPath(accountId), {
          headers: { ...readerHeaders, ...HEADERS },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
