/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { deleteTestExecutions } from '../../fixtures/delete_test_executions';

const POLL_TIMEOUT_MS = 60000;

// The user only holds the Workflows feature privilege, so it cannot call the user profile
// `_bulk_get` API. The names it sees must therefore be resolved by the workflows routes.
// A session (cookie) login is needed: only then is `executedBy` a profile uid, not a username.
apiTest.describe('Workflow executor profile', { tag: '@local-stateful-classic' }, () => {
  const spaceId = `workflow-executor-${randomUUID()}`;
  const executionIds: string[] = [];
  let workflowId: string;
  let userHeaders: Record<string, string>;
  let profileUid: string;
  let username: string;
  const headers = {
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '2023-10-31',
  };
  const yaml = `name: Executor profile test
enabled: true
triggers:
  - type: manual
steps:
  - name: message
    type: console
    with:
      message: executor profile test
`;

  apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    const user = await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [] },
      kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: [spaceId] }],
    });
    userHeaders = { ...headers, ...user.cookieHeader };
    const profile = await apiClient.get('internal/security/user_profile', { headers: userHeaders });
    expect(profile).toHaveStatusCode(200);
    profileUid = profile.body.uid;
    username = profile.body.user.username;
    const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
      headers: userHeaders,
      body: { yaml },
    });
    expect(created).toHaveStatusCode(200);
    workflowId = created.body.id;
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    await deleteTestExecutions(esClient, spaceId, executionIds);
    if (workflowId) {
      expect(
        await apiClient.delete(
          `s/${spaceId}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
          { headers: userHeaders }
        )
      ).toHaveStatusCode(200);
    }
    await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
  });

  apiTest(
    'resolves the executor name for a user without bulkGetUserProfiles',
    async ({ apiClient }) => {
      // Privileges are checked in the request's space, and the role only grants them in `spaceId`.
      const bulkGet = await apiClient.post(
        `s/${spaceId}/internal/security/user_profile/_bulk_get`,
        {
          headers: userHeaders,
          body: { uids: [profileUid] },
        }
      );
      expect(bulkGet).toHaveStatusCode(403);

      const run = await apiClient.post(`s/${spaceId}/api/workflows/workflow/${workflowId}/run`, {
        headers: userHeaders,
        body: { inputs: {} },
      });
      expect(run).toHaveStatusCode(200);
      const executionId: string = run.body.workflowExecutionId;
      executionIds.push(executionId);

      await expect
        .poll(
          async () => {
            const execution = await apiClient.get(
              `s/${spaceId}/api/workflows/executions/${executionId}`,
              { headers: userHeaders }
            );
            return execution.body.status;
          },
          { timeout: POLL_TIMEOUT_MS }
        )
        .toBe('completed');

      const execution = await apiClient.get(
        `s/${spaceId}/api/workflows/executions/${executionId}`,
        { headers: userHeaders }
      );
      expect(execution).toHaveStatusCode(200);
      expect(execution.body.executedBy).toBe(profileUid);
      expect(execution.body.executedByProfile.uid).toBe(profileUid);
      expect(execution.body.executedByProfile.user.username).toBe(username);

      // The list is a search, so it can lag behind the real-time read above until the next refresh.
      const listPath = `s/${spaceId}/api/workflows/workflow/${workflowId}/executions`;
      await expect
        .poll(
          async () =>
            (
              await apiClient.get(listPath, { headers: userHeaders })
            ).body.results?.length,
          { timeout: POLL_TIMEOUT_MS }
        )
        .toBe(1);
      const list = await apiClient.get(listPath, { headers: userHeaders });
      expect(list).toHaveStatusCode(200);
      expect(list.body.results[0].executedByProfile.user.username).toBe(username);
    }
  );

  apiTest(
    'resolves the workflow owner name for the access control modal',
    async ({ apiClient }) => {
      const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
      const makePrivate = await apiClient.put(accessPath, {
        headers: userHeaders,
        body: { access_mode: 'private', entries: [] },
      });
      expect(makePrivate).toHaveStatusCode(200);

      const profiles = await apiClient.get(`${accessPath}/_profiles`, { headers: userHeaders });

      expect(profiles).toHaveStatusCode(200);
      expect(profiles.body).toHaveLength(1);
      expect(profiles.body[0].uid).toBe(profileUid);
      expect(profiles.body[0].user.username).toBe(username);
    }
  );

  apiTest(
    'does not resolve the unvalidated entries of a public ACL for the access control modal',
    async ({ apiClient, kbnClient, esClient }) => {
      // A user with a profile but without any Workflows privilege. Basic auth is used because
      // `samlAuth` custom roles are shared per worker, and would replace the owner's role.
      const bystanderName = `workflow-bystander-${randomUUID()}`;
      const bystanderPassword = randomUUID();
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${bystanderName}`,
        body: {
          elasticsearch: { cluster: [] },
          kibana: [{ base: [], feature: { dashboard_v2: ['read'] }, spaces: [spaceId] }],
        },
      });
      await esClient.security.putUser({
        username: bystanderName,
        password: bystanderPassword,
        roles: [bystanderName],
      });
      try {
        const bystanderProfile = await apiClient.get('internal/security/user_profile', {
          headers: {
            ...headers,
            Authorization: `Basic ${Buffer.from(`${bystanderName}:${bystanderPassword}`).toString(
              'base64'
            )}`,
          },
        });
        expect(bystanderProfile).toHaveStatusCode(200);
        const entries = [{ type: 'user', id: bystanderProfile.body.uid, role: 'viewer' }];
        const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;

        // Public ACLs keep their entries without checking the users' Workflows privileges.
        const makePublic = await apiClient.put(accessPath, {
          headers: userHeaders,
          body: { access_mode: 'public', entries },
        });
        expect(makePublic).toHaveStatusCode(200);
        const profiles = await apiClient.get(`${accessPath}/_profiles`, { headers: userHeaders });

        expect(profiles).toHaveStatusCode(200);
        expect(profiles.body.map(({ uid }: { uid: string }) => uid)).toStrictEqual([profileUid]);

        // Private ACLs only accept users who hold Workflows privileges in the space.
        const makePrivate = await apiClient.put(accessPath, {
          headers: userHeaders,
          body: { access_mode: 'private', entries },
        });
        expect(makePrivate).toHaveStatusCode(400);
      } finally {
        await esClient.security.deleteUser({ username: bystanderName });
        await kbnClient.request({ method: 'DELETE', path: `/api/security/role/${bystanderName}` });
      }
    }
  );
});
