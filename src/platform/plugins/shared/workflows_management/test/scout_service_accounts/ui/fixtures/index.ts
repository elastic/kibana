/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import type { WorkflowServiceAccount } from '../../../../public/entities/service_accounts';
import { spaceTest } from '../../../scout/ui/fixtures';
import { cleanupEsServiceAccounts } from '../../api/fixtures/cleanup_es_service_accounts';

export const workflowYaml = `name: Service account editor regression
enabled: false
triggers:
  - type: manual
steps:
  - name: marker
    type: console
    with:
      message: Service account editor regression
`;

export const test = spaceTest.extend<
  {
    workflowId: string;
    paginatedDirectory: { requestedCursors: Array<string | null> };
  },
  { serviceAccount: WorkflowServiceAccount }
>({
  serviceAccount: [
    async ({ kbnClient, esClient, config }, use) => {
      const created = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: '/internal/security/service_account',
        body: { name: `scout-picker-${randomUUID()}`, roles: ['viewer'] },
      });
      try {
        const { data } = await kbnClient.request<WorkflowServiceAccount>({
          method: 'GET',
          path: `/internal/security/service_account/${encodeURIComponent(created.data.id)}`,
        });
        await use(data);
      } finally {
        await cleanupEsServiceAccounts(esClient, config, [created.data.id]);
      }
    },
    { scope: 'worker' },
  ],
  workflowId: async ({ apiServices, serviceAccount }, use) => {
    // Keep the account alive until the workflow has been deleted and unbound.
    const workflow = await apiServices.workflows.create(
      workflowYaml.replace('Service account editor regression', serviceAccount.name)
    );
    try {
      await use(workflow.id);
    } finally {
      await apiServices.workflows.hardDelete(workflow.id);
    }
  },
  paginatedDirectory: async ({ page, serviceAccount }, use) => {
    const requestedCursors: Array<string | null> = [];
    await page.route('**/internal/security/service_account?*', async (route) => {
      const after = new URL(route.request().url()).searchParams.get('after');
      requestedCursors.push(after);
      await route.fulfill({
        json:
          after === 'second-page'
            ? { serviceAccounts: [serviceAccount] }
            : {
                serviceAccounts: [
                  { ...serviceAccount, id: 'first-page-account', name: 'First reader' },
                ],
                nextPage: 'second-page',
              },
      });
    });
    await use({ requestedCursors });
  },
});
