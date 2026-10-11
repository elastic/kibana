/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  accountPath,
  boundWorkflow,
  createBoundWorkflow,
  deleteBoundWorkflow,
} from '../fixtures/bound_workflows';
import { createServiceAccountSuite } from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: bound workload names',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown } = createServiceAccountSuite();
    const workflow = {
      spaceId: `sa-names-${randomUUID()}`,
      workflowId: `sa-names-${randomUUID()}`,
      workflowName: `Bound workload ${randomUUID()}`,
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const { headers, accountId } = getContext();
      await createBoundWorkflow(apiClient, headers, { ...workflow, accountId });
    });

    apiTest.afterAll(async ({ apiClient, esClient, config }) => {
      try {
        await deleteBoundWorkflow(apiClient, getContext().headers, workflow);
      } finally {
        await teardown({ apiClient, esClient, config });
      }
    });

    apiTest(
      'names and links a bound workflow in its space when listing and refusing a delete',
      async ({ apiClient }) => {
        const { headers, accountId } = getContext();
        const expectedWorkloads = [
          boundWorkflow(workflow.spaceId, workflow.workflowId, workflow.workflowName),
        ];

        const listed = await apiClient.get(`${accountPath(accountId)}/workloads`, {
          headers,
          responseType: 'json',
        });
        expect(listed, JSON.stringify(listed.body)).toHaveStatusCode(200);
        expect(listed.body).toStrictEqual({ workloads: expectedWorkloads });

        const refused = await apiClient.delete(accountPath(accountId), {
          headers,
          responseType: 'json',
        });
        expect(refused, JSON.stringify(refused.body)).toHaveStatusCode(409);
        expect(refused.body.attributes).toStrictEqual({ workloads: expectedWorkloads });
      }
    );
  }
);
