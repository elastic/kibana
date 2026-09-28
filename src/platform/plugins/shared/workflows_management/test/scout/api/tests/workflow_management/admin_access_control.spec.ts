/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

apiTest.describe('Workflow administrator recovery', { tag: tags.stateful.classic }, () => {
  const spaceId = `workflow-admin-${randomUUID()}`;
  const adminUsername = `workflow-superuser-${randomUUID()}`;
  const adminPassword = randomUUID();
  let workflowId: string;
  let ownerProfileId: string;
  let adminHeaders: Record<string, string>;
  const headers = {
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '2023-10-31',
  };

  apiTest.beforeAll(async ({ kbnClient, esClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    await esClient.security.putUser({
      username: adminUsername,
      password: adminPassword,
      roles: ['superuser'],
    });
    adminHeaders = {
      ...headers,
      Authorization: `Basic ${Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64')}`,
    };
  });

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    if (ownerProfileId) await esClient.security.enableUserProfile({ uid: ownerProfileId });
    if (workflowId) {
      expect(
        await apiClient.delete(
          `s/${spaceId}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
          { headers: adminHeaders }
        )
      ).toHaveStatusCode(200);
    }
    await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
    await esClient.security.deleteUser({ username: adminUsername });
  });

  apiTest(
    'recovers access after owner offboarding without granting an override to Workflows All',
    async ({ apiClient, samlAuth, requestAuth, esClient }) => {
      apiTest.setTimeout(120_000);
      const role = {
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: [spaceId] }],
      };
      const owner = await samlAuth.asInteractiveUser(role);
      const ownerHeaders = { ...headers, ...owner.cookieHeader };
      const profile = await apiClient.get('internal/security/user_profile', {
        headers: ownerHeaders,
      });
      expect(profile).toHaveStatusCode(200);
      ownerProfileId = profile.body.uid;
      const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
        headers: ownerHeaders,
        body: {
          yaml: `name: Admin recovery
enabled: false
triggers:
  - type: manual
steps:
  - name: message
    type: console
    with:
      message: recovered
`,
        },
      });
      expect(created).toHaveStatusCode(200);
      workflowId = created.body.id;
      const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      expect(
        await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: { access_mode: 'private', entries: [] },
        })
      ).toHaveStatusCode(200);
      await esClient.security.disableUserProfile({ uid: ownerProfileId });

      const reader = await samlAuth.asInteractiveUser('editor');
      const readerHeaders = { ...headers, ...reader.cookieHeader };
      expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(404);
      expect(
        await apiClient.put(accessPath, {
          headers: readerHeaders,
          body: { access_mode: 'public' },
        })
      ).toHaveStatusCode(403);
      const equivalentAdmin = await samlAuth.asInteractiveUser('admin');
      expect(
        await apiClient.get(workflowPath, {
          headers: { ...headers, ...equivalentAdmin.cookieHeader },
        })
      ).toHaveStatusCode(404);
      const adminKey = await requestAuth.getApiKey('admin');
      expect(
        await apiClient.get(workflowPath, {
          headers: { ...headers, ...adminKey.apiKeyHeader },
        })
      ).toHaveStatusCode(404);
      const limitedKey = await requestAuth.getApiKeyForCustomRole(role);
      expect(
        await apiClient.get(workflowPath, {
          headers: { ...headers, ...limitedKey.apiKeyHeader },
        })
      ).toHaveStatusCode(404);

      const recovered = await apiClient.get(workflowPath, { headers: adminHeaders });
      expect(recovered).toHaveStatusCode(200);
      expect(recovered.body).toMatchObject({
        owner_id: ownerProfileId,
        permissions: { read: true, execute: false, edit: true, manage: true },
      });
      const profileResponse = await apiClient.get('internal/security/user_profile', {
        headers: adminHeaders,
      });
      expect(profileResponse).toHaveStatusCode(200);
      const adminProfileId = profileResponse.body.uid;
      for (const body of [
        { workflowId, inputs: {} },
        { workflowId, workflowYaml: recovered.body.yaml, inputs: {} },
      ]) {
        expect(
          await apiClient.post(`s/${spaceId}/api/workflows/test`, { headers: adminHeaders, body })
        ).toHaveStatusCode(403);
      }
      expect(
        await apiClient.post(`s/${spaceId}/api/workflows/step/test`, {
          headers: adminHeaders,
          body: {
            workflowId,
            workflowYaml: recovered.body.yaml,
            stepId: 'message',
            contextOverride: {},
          },
        })
      ).toHaveStatusCode(403);
      const grant = await apiClient.put(accessPath, {
        headers: adminHeaders,
        body: {
          access_mode: 'private',
          entries: [{ type: 'user', id: adminProfileId, role: 'executor' }],
        },
      });
      expect(grant).toHaveStatusCode(200);
      expect(grant.body.owner_id).toBe(ownerProfileId);
      expect(grant.body.permissions.execute).toBe(true);
      const run = await apiClient.post(`s/${spaceId}/api/workflows/test`, {
        headers: adminHeaders,
        body: { workflowId, inputs: {} },
      });
      expect(run).toHaveStatusCode(200);
      await expect
        .poll(
          async () => {
            const execution = await apiClient.get(
              `s/${spaceId}/api/workflows/executions/${run.body.workflowExecutionId}`,
              { headers: adminHeaders }
            );
            expect(execution).toHaveStatusCode(200);
            return execution.body.status;
          },
          { timeout: 60000 }
        )
        .toBe('completed');
      const history = await apiClient.get(`${workflowPath}/executions`, { headers: adminHeaders });
      expect(history).toHaveStatusCode(200);
      expect(history.body.results).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: run.body.workflowExecutionId, status: 'completed' }),
        ])
      );
      const revoked = await apiClient.put(accessPath, {
        headers: adminHeaders,
        body: { access_mode: 'private', entries: [] },
      });
      expect(revoked).toHaveStatusCode(200);
      expect(revoked.body.permissions.execute).toBe(false);
      expect(
        await apiClient.post(`s/${spaceId}/api/workflows/test`, {
          headers: adminHeaders,
          body: { workflowId, inputs: {} },
        })
      ).toHaveStatusCode(403);
      const updated = await apiClient.put(accessPath, {
        headers: adminHeaders,
        body: { access_mode: 'public', entries: [] },
      });
      expect(updated).toHaveStatusCode(200);
      expect(updated.body.owner_id).toBe(ownerProfileId);
      const visible = await apiClient.get(workflowPath, { headers: readerHeaders });
      expect(visible).toHaveStatusCode(200);
      expect(visible.body.permissions.manage).toBe(false);
      expect(
        await apiClient.put(accessPath, {
          headers: adminHeaders,
          body: { access_mode: 'private', entries: [] },
        })
      ).toHaveStatusCode(200);
    }
  );
});
