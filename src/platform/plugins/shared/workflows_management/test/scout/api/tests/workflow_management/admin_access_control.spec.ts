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
  let workflowId: string;
  let ownerProfileId: string;
  let adminHeaders: Record<string, string>;
  const headers = {
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '2023-10-31',
  };

  apiTest.beforeAll(async ({ kbnClient, samlAuth }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    const admin = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...headers, ...admin.cookieHeader };
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
        permissions: { read: true, execute: true, edit: true, manage: true },
      });
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
