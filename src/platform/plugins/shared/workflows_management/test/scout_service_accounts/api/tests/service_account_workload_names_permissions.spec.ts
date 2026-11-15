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
import type { EsClient, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  accountPath,
  boundWorkflow,
  createBoundWorkflow,
  deleteBoundWorkflow,
  HEADERS,
} from '../fixtures/bound_workflows';
import { createServiceAccountSuite } from '../fixtures/service_account_suite';

// Stateful only: these cases need a user that holds `manage_security` but is not a workflow access
// control admin. Serverless custom roles cannot grant `manage_security`, and the built-in roles that
// hold it can open private workflows.
apiTest.describe(
  '[NON-MKI] Workflow service accounts: bound workload names for other callers',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown } = createServiceAccountSuite();
    const spaceId = `sa-names-${randomUUID()}`;
    const workflowId = `sa-names-${randomUUID()}`;
    const workflowName = `Private workload ${randomUUID()}`;
    /** May manage security and workflows, but cannot open the private workflow. */
    const securityAdmin = `sa-names-security-admin-${randomUUID()}`;
    /** May manage workflows, but not security. */
    const workflowsEditor = `sa-names-workflows-editor-${randomUUID()}`;
    const createdUsers: string[] = [];
    let securityAdminHeaders: Record<string, string>;
    let workflowsEditorHeaders: Record<string, string>;

    /**
     * Creates a user with a role of the same name, and returns headers that authenticate as it.
     * The role reaches every space, since the service account routes check privileges globally.
     */
    const createUser = async (
      kbnClient: KbnClient,
      esClient: EsClient,
      username: string,
      cluster: string[]
    ): Promise<Record<string, string>> => {
      createdUsers.push(username);
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${username}`,
        body: {
          elasticsearch: { cluster },
          kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: ['*'] }],
        },
      });
      const password = randomUUID();
      await esClient.security.putUser({ username, password, roles: [username] });
      return {
        ...HEADERS,
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      };
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient, kbnClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const { headers, accountId } = getContext();
      await createBoundWorkflow(apiClient, headers, {
        spaceId,
        workflowId,
        workflowName,
        accountId,
      });

      const madePrivate = await apiClient.put(
        `s/${spaceId}/internal/workflows/${workflowId}/access_control`,
        { headers, body: { access_mode: 'private', entries: [] }, responseType: 'json' }
      );
      expect(madePrivate, JSON.stringify(madePrivate.body)).toHaveStatusCode(200);

      securityAdminHeaders = await createUser(kbnClient, esClient, securityAdmin, [
        'manage_security',
      ]);
      workflowsEditorHeaders = await createUser(kbnClient, esClient, workflowsEditor, []);
    });

    apiTest.afterAll(async ({ apiClient, esClient, config, kbnClient }) => {
      const { headers } = getContext();
      try {
        for (const username of createdUsers) {
          await esClient.security.deleteUser({ username }, { ignore: [404] });
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/security/role/${username}`,
            ignoreErrors: [404],
          });
        }

        await deleteBoundWorkflow(apiClient, headers, { spaceId, workflowId });
      } finally {
        await teardown({ apiClient, esClient, config });
      }
    });

    apiTest(
      'names and links a private workflow for a security admin who cannot open it',
      async ({ apiClient }) => {
        const { accountId } = getContext();
        const expectedWorkloads = [boundWorkflow(spaceId, workflowId, workflowName)];

        const listed = await apiClient.get(`${accountPath(accountId)}/workloads`, {
          headers: securityAdminHeaders,
          responseType: 'json',
        });
        expect(listed, JSON.stringify(listed.body)).toHaveStatusCode(200);
        expect(listed.body).toStrictEqual({ workloads: expectedWorkloads });

        const refused = await apiClient.delete(accountPath(accountId), {
          headers: securityAdminHeaders,
          responseType: 'json',
        });
        expect(refused, JSON.stringify(refused.body)).toHaveStatusCode(409);
        expect(refused.body.attributes).toStrictEqual({ workloads: expectedWorkloads });

        const opened = await apiClient.get(`s/${spaceId}/api/workflows/workflow/${workflowId}`, {
          headers: securityAdminHeaders,
          responseType: 'json',
        });
        expect(opened).toHaveStatusCode(404);
      }
    );

    apiTest(
      'tells a caller without manage_security nothing about the bound workloads',
      async ({ apiClient }) => {
        const { accountId } = getContext();

        const listed = await apiClient.get(`${accountPath(accountId)}/workloads`, {
          headers: workflowsEditorHeaders,
          responseType: 'json',
        });
        expect(listed).toHaveStatusCode(403);
        expect(JSON.stringify(listed.body)).not.toContain(workflowName);

        const refused = await apiClient.delete(accountPath(accountId), {
          headers: workflowsEditorHeaders,
          responseType: 'json',
        });
        expect(refused).toHaveStatusCode(403);
        expect(refused.body.attributes).toBeUndefined();
        expect(JSON.stringify(refused.body)).not.toContain(workflowName);
      }
    );
  }
);
