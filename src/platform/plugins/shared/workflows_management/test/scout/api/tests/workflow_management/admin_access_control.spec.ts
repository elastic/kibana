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

const recoveryTags = [
  ...tags.stateful.classic,
  ...tags.serverless.security.complete,
  ...tags.serverless.observability.complete,
  ...tags.serverless.search,
];

apiTest.describe('Workflow administrator recovery', { tag: recoveryTags }, () => {
  const spaceId = `workflow-admin-${randomUUID()}`;
  const adminUsername = `workflow-administrator-${randomUUID()}`;
  const adminPassword = randomUUID();
  let workflowId: string | undefined;
  let workflowPath: string;
  let accessPath: string;
  let ownerProfileId: string;
  const role = {
    elasticsearch: { cluster: [] },
    kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: [spaceId] }],
  };
  let adminHeaders: Record<string, string>;
  const headers = {
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '2023-10-31',
  };

  apiTest.beforeAll(async ({ kbnClient, esClient, config, samlAuth }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    if (config.serverless) {
      const admin = await samlAuth.asInteractiveUser('admin');
      adminHeaders = { ...headers, ...admin.cookieHeader };
      return;
    }
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

  apiTest.beforeEach(async ({ apiClient, samlAuth, esClient }) => {
    workflowId = undefined;
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
    accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
    workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
    expect(
      await apiClient.put(accessPath, {
        headers: ownerHeaders,
        body: { access_mode: 'private', entries: [] },
      })
    ).toHaveStatusCode(200);
    await esClient.security.disableUserProfile({ uid: ownerProfileId });
  });

  apiTest.afterEach(async ({ apiClient, esClient, samlAuth }) => {
    try {
      if (ownerProfileId) await esClient.security.enableUserProfile({ uid: ownerProfileId });
    } finally {
      if (workflowId) {
        const owner = await samlAuth.asInteractiveUser(role);
        expect(
          await apiClient.delete(
            `s/${spaceId}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
            { headers: { ...headers, ...owner.cookieHeader } }
          )
        ).toHaveStatusCode(200);
      }
    }
  });

  apiTest.afterAll(async ({ kbnClient, esClient, config }) => {
    try {
      await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
    } finally {
      if (!config.serverless) await esClient.security.deleteUser({ username: adminUsername });
    }
  });

  apiTest(
    "Workflows All cannot read or change another owner's private access",
    async ({ apiClient, samlAuth, config }) => {
      const reader = await samlAuth.asInteractiveUser(
        config.projectType === 'es' ? 'developer' : 'editor'
      );
      const readerHeaders = { ...headers, ...reader.cookieHeader };
      expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(404);
      expect(
        await apiClient.put(accessPath, {
          headers: readerHeaders,
          body: { access_mode: 'public' },
        })
      ).toHaveStatusCode(403);
    }
  );

  apiTest('a wildcard admin role can manage access', async ({ apiClient, samlAuth }) => {
    const equivalentAdmin = await samlAuth.asInteractiveUser('admin');
    const equivalentAdminHeaders = { ...headers, ...equivalentAdmin.cookieHeader };
    expect(
      await apiClient.get(workflowPath, {
        headers: equivalentAdminHeaders,
      })
    ).toHaveStatusCode(200);
    const updated = await apiClient.put(accessPath, {
      headers: equivalentAdminHeaders,
      body: { access_mode: 'public', entries: [] },
    });
    expect(updated).toHaveStatusCode(200);
    const saved = await apiClient.get(workflowPath, { headers: equivalentAdminHeaders });
    expect(saved).toHaveStatusCode(200);
    expect(saved.body).toMatchObject({
      owner_id: ownerProfileId,
      access_control: { access_mode: 'public', entries: [] },
    });
  });

  apiTest(
    'an administrator API key does not get an override',
    async ({ apiClient, requestAuth, config }) => {
      const adminKey = config.serverless
        ? await requestAuth.getApiKey('admin')
        : await requestAuth.getApiKeyForBuiltInRole('superuser');
      expect(
        await apiClient.get(workflowPath, {
          headers: { ...headers, ...adminKey.apiKeyHeader },
        })
      ).toHaveStatusCode(404);
    }
  );

  apiTest('a Workflows API key does not get an override', async ({ apiClient, requestAuth }) => {
    const limitedKey = await requestAuth.getApiKeyForCustomRole(role);
    expect(
      await apiClient.get(workflowPath, {
        headers: { ...headers, ...limitedKey.apiKeyHeader },
      })
    ).toHaveStatusCode(404);
  });

  apiTest(
    'an administrator can recover an offboarded owner without an execution grant',
    async ({ apiClient }) => {
      const recovered = await apiClient.get(workflowPath, { headers: adminHeaders });
      expect(recovered).toHaveStatusCode(200);
      expect(recovered.body).toMatchObject({
        owner_id: ownerProfileId,
        permissions: { read: true, execute: false, edit: false, manage: true },
      });
    }
  );

  apiTest(
    'an administrator cannot test a saved workflow without an ACL grant',
    async ({ apiClient }) => {
      expect(
        await apiClient.post(`s/${spaceId}/api/workflows/test`, {
          headers: adminHeaders,
          body: { workflowId, inputs: {} },
        })
      ).toHaveStatusCode(403);
    }
  );

  apiTest('an administrator cannot test a draft without an ACL grant', async ({ apiClient }) => {
    const recovered = await apiClient.get(workflowPath, { headers: adminHeaders });
    expect(recovered).toHaveStatusCode(200);
    expect(
      await apiClient.post(`s/${spaceId}/api/workflows/test`, {
        headers: adminHeaders,
        body: { workflowId, workflowYaml: recovered.body.yaml, inputs: {} },
      })
    ).toHaveStatusCode(403);
  });

  apiTest('an administrator cannot test a step without an ACL grant', async ({ apiClient }) => {
    const recovered = await apiClient.get(workflowPath, { headers: adminHeaders });
    expect(recovered).toHaveStatusCode(200);
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
  });

  apiTest(
    'an administrator can hard-delete a private workflow without an ACL grant',
    async ({ apiClient }) => {
      expect(await apiClient.delete(workflowPath, { headers: adminHeaders })).toHaveStatusCode(403);
      expect(
        await apiClient.delete(`${workflowPath}?force=true&acknowledgeAclLoss=true`, {
          headers: adminHeaders,
        })
      ).toHaveStatusCode(200);
      expect(await apiClient.get(workflowPath, { headers: adminHeaders })).toHaveStatusCode(404);
      workflowId = undefined;
    }
  );

  apiTest(
    'an administrator needs an Editor grant to change the workflow',
    async ({ apiClient }) => {
      const recovered = await apiClient.get(workflowPath, { headers: adminHeaders });
      expect(recovered).toHaveStatusCode(200);
      const update = () =>
        apiClient.put(workflowPath, {
          headers: adminHeaders,
          body: { description: 'Recovered by administrator' },
        });
      expect(await update()).toHaveStatusCode(403);
      expect(await apiClient.delete(workflowPath, { headers: adminHeaders })).toHaveStatusCode(403);
      const profile = await apiClient.get('internal/security/user_profile', {
        headers: adminHeaders,
      });
      expect(profile).toHaveStatusCode(200);
      for (const accessRole of ['executor', 'editor']) {
        expect(
          await apiClient.put(accessPath, {
            headers: adminHeaders,
            body: {
              access_mode: 'private',
              entries: [{ type: 'user', id: profile.body.uid, role: accessRole }],
            },
          })
        ).toHaveStatusCode(200);
        expect(await update()).toHaveStatusCode(accessRole === 'editor' ? 200 : 403);
      }
      const updated = await apiClient.get(workflowPath, { headers: adminHeaders });
      expect(updated.body.description).toBe('Recovered by administrator');
      expect(updated.body.owner_id).toBe(ownerProfileId);
    }
  );

  apiTest(
    'an administrator can grant and revoke execution access without changing the owner',
    async ({ apiClient }) => {
      apiTest.setTimeout(90_000);
      const profileResponse = await apiClient.get('internal/security/user_profile', {
        headers: adminHeaders,
      });
      expect(profileResponse).toHaveStatusCode(200);
      const adminProfileId = profileResponse.body.uid;
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
      await expect
        .poll(async () => {
          const history = await apiClient.get(`${workflowPath}/executions`, {
            headers: adminHeaders,
          });
          expect(history).toHaveStatusCode(200);
          return history.body.results;
        })
        .toStrictEqual(
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
    }
  );

  apiTest(
    'an administrator can restore public access without changing the owner',
    async ({ apiClient, samlAuth, config }) => {
      const reader = await samlAuth.asInteractiveUser(
        config.projectType === 'es' ? 'developer' : 'editor'
      );
      const readerHeaders = { ...headers, ...reader.cookieHeader };
      const updated = await apiClient.put(accessPath, {
        headers: adminHeaders,
        body: { access_mode: 'public', entries: [] },
      });
      expect(updated).toHaveStatusCode(200);
      expect(updated.body.owner_id).toBe(ownerProfileId);
      const visible = await apiClient.get(workflowPath, { headers: readerHeaders });
      expect(visible).toHaveStatusCode(200);
      expect(visible.body.permissions.manage).toBe(false);
    }
  );
});
