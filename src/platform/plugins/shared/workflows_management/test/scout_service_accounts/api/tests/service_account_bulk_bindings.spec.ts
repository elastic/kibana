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
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { accountPath, HEADERS } from '../fixtures/bound_workflows';
import { createServiceAccountSuite, workflowYaml } from '../fixtures/service_account_suite';

/** Long enough for several workflow runs, each polled until it completes. */
const RUNS_TIMEOUT_MS = 180_000;

const unboundYaml = (accountId: string): string =>
  workflowYaml(accountId).replace(`settings:\n  run_as: ${accountId}\n`, '');

// Stateful only: the refusal case needs a native user that may manage workflows but not security.
apiTest.describe(
  '[NON-MKI] Workflow service accounts: bulk bindings',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    const workflowsEditor = `sa-bulk-workflows-editor-${randomUUID()}`;
    let workflowsEditorHeaders: Record<string, string>;

    /** The workflows bound to the account, as the service account routes list them. */
    const boundWorkflowIds = async (
      apiClient: ApiClientFixture,
      accountId: string
    ): Promise<string[]> => {
      const { headers } = getContext();
      const listed = await apiClient.get(`${accountPath(accountId)}/workloads`, {
        headers,
        responseType: 'json',
      });
      expect(listed, JSON.stringify(listed.body)).toHaveStatusCode(200);
      return (listed.body.workloads as Array<{ workloadId: string }>)
        .map(({ workloadId }) => workloadId)
        .sort();
    };

    const bulkCreate = async (
      apiClient: ApiClientFixture,
      workflows: Array<{ id: string; yaml: string }>,
      { overwrite = false, headers = getContext().headers } = {}
    ) => {
      const response = await apiClient.post(`api/workflows${overwrite ? '?overwrite=true' : ''}`, {
        headers,
        body: { workflows },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      for (const { id } of response.body.created as Array<{ id: string }>) {
        getContext().workflowIds.add(id);
      }
      return response.body as {
        created: Array<{ id: string }>;
        failed: Array<{ id: string; error: string }>;
      };
    };

    const newIds = (count: number): string[] =>
      Array.from({ length: count }, (_, index) => `sa-bulk-${Date.now()}-${index}`);

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient, kbnClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${workflowsEditor}`,
        body: {
          elasticsearch: { cluster: [] },
          kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: ['*'] }],
        },
      });
      const password = randomUUID();
      await esClient.security.putUser({
        username: workflowsEditor,
        password,
        roles: [workflowsEditor],
      });
      workflowsEditorHeaders = {
        ...HEADERS,
        Authorization: `Basic ${Buffer.from(`${workflowsEditor}:${password}`).toString('base64')}`,
      };
    });

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(async ({ apiClient, esClient, config, kbnClient }) => {
      try {
        await esClient.security.deleteUser({ username: workflowsEditor }, { ignore: [404] });
        await kbnClient.request({
          method: 'DELETE',
          path: `/api/security/role/${workflowsEditor}`,
          ignoreErrors: [404],
        });
      } finally {
        await teardown({ apiClient, esClient, config });
      }
    });

    apiTest(
      'a bulk import binds each workflow to its own account, and each runs as it',
      async ({ apiClient }) => {
        const { accountId, otherAccountId, run, wait, expectAccount } = getContext();
        apiTest.setTimeout(RUNS_TIMEOUT_MS);
        const [first, second, other, unbound] = newIds(4);

        const imported = await bulkCreate(apiClient, [
          { id: first, yaml: workflowYaml(accountId) },
          { id: second, yaml: workflowYaml(accountId) },
          { id: other, yaml: workflowYaml(otherAccountId) },
          { id: unbound, yaml: unboundYaml(accountId) },
        ]);

        expect(imported.failed).toStrictEqual([]);
        expect(imported.created.map(({ id }) => id).sort()).toStrictEqual(
          [first, second, other, unbound].sort()
        );
        expect(await boundWorkflowIds(apiClient, accountId)).toStrictEqual([first, second].sort());
        expect(await boundWorkflowIds(apiClient, otherAccountId)).toStrictEqual([other]);
        expectAccount(await wait(apiClient, await run(apiClient, second)), accountId);
        expectAccount(await wait(apiClient, await run(apiClient, other)), otherAccountId);
        const unboundRun = await wait(apiClient, await run(apiClient, unbound));
        expect(unboundRun.effectiveIdentity).toBeUndefined();
      }
    );

    apiTest(
      'a bulk overwrite rebinds existing workflows and binds new ones in the same request',
      async ({ apiClient }) => {
        const { accountId, otherAccountId, run, wait, expectAccount } = getContext();
        apiTest.setTimeout(RUNS_TIMEOUT_MS);
        const [existing, added] = newIds(2);
        await bulkCreate(apiClient, [{ id: existing, yaml: workflowYaml(accountId) }]);

        const overwritten = await bulkCreate(
          apiClient,
          [
            { id: existing, yaml: workflowYaml(otherAccountId) },
            { id: added, yaml: workflowYaml(otherAccountId) },
          ],
          { overwrite: true }
        );

        expect(overwritten.failed).toStrictEqual([]);
        expect(await boundWorkflowIds(apiClient, accountId)).toStrictEqual([]);
        expect(await boundWorkflowIds(apiClient, otherAccountId)).toStrictEqual(
          [existing, added].sort()
        );
        expectAccount(await wait(apiClient, await run(apiClient, existing)), otherAccountId);
        expectAccount(await wait(apiClient, await run(apiClient, added)), otherAccountId);
      }
    );

    apiTest('a bulk delete removes every binding', async ({ apiClient }) => {
      const { headers, accountId, otherAccountId, workflowIds } = getContext();
      const ids = newIds(3);
      await bulkCreate(apiClient, [
        { id: ids[0], yaml: workflowYaml(accountId) },
        { id: ids[1], yaml: workflowYaml(accountId) },
        { id: ids[2], yaml: workflowYaml(otherAccountId) },
      ]);

      const deleted = await apiClient.delete('api/workflows?force=true', {
        headers,
        body: { ids },
        responseType: 'json',
      });

      expect(deleted, JSON.stringify(deleted.body)).toHaveStatusCode(200);
      expect(deleted.body.failures).toStrictEqual([]);
      expect(deleted.body.deleted).toBe(3);
      ids.forEach((id) => workflowIds.delete(id));
      expect(await boundWorkflowIds(apiClient, accountId)).toStrictEqual([]);
      expect(await boundWorkflowIds(apiClient, otherAccountId)).toStrictEqual([]);
    });

    apiTest(
      'a caller without manage_security gets the bound workflows refused and the rest created',
      async ({ apiClient }) => {
        const { accountId } = getContext();
        const [bound, unbound] = newIds(2);

        const imported = await bulkCreate(
          apiClient,
          [
            { id: bound, yaml: workflowYaml(accountId) },
            { id: unbound, yaml: unboundYaml(accountId) },
          ],
          { headers: workflowsEditorHeaders }
        );

        expect(imported.created.map(({ id }) => id)).toStrictEqual([unbound]);
        expect(imported.failed).toStrictEqual([
          { index: 0, id: bound, error: expect.stringContaining('manage_security') },
        ]);
        expect(await boundWorkflowIds(apiClient, accountId)).toStrictEqual([]);
      }
    );
  }
);
