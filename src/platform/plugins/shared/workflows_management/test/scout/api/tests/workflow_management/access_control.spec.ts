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

apiTest.describe('Workflow access control', { tag: tags.stateful.classic }, () => {
  const spaceId = `workflow-acl-${randomUUID()}`;
  let workflowId: string;
  let readerProfileId: string;
  let ownerHeaders: Record<string, string>;
  let readerHeaders: Record<string, string>;
  const headers = {
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '2023-10-31',
  };
  const yaml = `name: Access control test
enabled: true
triggers:
  - type: manual
steps:
  - name: message
    type: console
    with:
      message: access test
`;

  apiTest.beforeAll(async ({ apiClient, samlAuth, kbnClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    const owner = await samlAuth.asInteractiveUser('admin');
    const reader = await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [] },
      kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: [spaceId] }],
    });
    ownerHeaders = { ...headers, ...owner.cookieHeader };
    readerHeaders = { ...headers, ...reader.cookieHeader };
    const profile = await apiClient.get('internal/security/user_profile', {
      headers: readerHeaders,
    });
    expect(profile).toHaveStatusCode(200);
    readerProfileId = profile.body.uid;
    const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
      headers: ownerHeaders,
      body: { yaml },
    });
    expect(created).toHaveStatusCode(200);
    workflowId = created.body.id;
  });

  apiTest.afterAll(async ({ apiClient, kbnClient }) => {
    if (workflowId) {
      await apiClient.delete(`s/${spaceId}/api/workflows/workflow/${workflowId}`, {
        headers: ownerHeaders,
      });
    }
    await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
  });

  apiTest(
    'enforces private, viewer, executor, editor, and public access',
    async ({ apiClient }) => {
      const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      const makePrivate = await apiClient.put(accessPath, {
        headers: ownerHeaders,
        body: { access_mode: 'private', entries: [] },
      });
      expect(makePrivate).toHaveStatusCode(200);
      expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(404);
      expect(
        await apiClient.post(`${workflowPath}/run`, {
          headers: readerHeaders,
          body: { inputs: {} },
        })
      ).toHaveStatusCode(404);
      const hiddenList = await apiClient.get(`s/${spaceId}/api/workflows`, {
        headers: readerHeaders,
      });
      expect(hiddenList).toHaveStatusCode(200);
      expect(hiddenList.body.total).toBe(0);
      const hiddenStats = await apiClient.get(`s/${spaceId}/api/workflows/stats`, {
        headers: readerHeaders,
      });
      expect(hiddenStats).toHaveStatusCode(200);
      expect(hiddenStats.body.workflows.enabled).toBe(0);

      let executionId: string | undefined;
      for (const role of ['viewer', 'executor', 'editor'] as const) {
        const shared = await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: { access_mode: 'private', entries: [{ type: 'user', id: readerProfileId, role }] },
        });
        expect(shared).toHaveStatusCode(200);
        expect(shared.body.entries[0].added_at).toBeDefined();
        const read = await apiClient.get(workflowPath, { headers: readerHeaders });
        expect(read).toHaveStatusCode(200);
        expect(read.body.permissions).toMatchObject({
          read: true,
          execute: role !== 'viewer',
          edit: role === 'editor',
          manage: false,
        });
        const run = await apiClient.post(`${workflowPath}/run`, {
          headers: readerHeaders,
          body: { inputs: {} },
        });
        expect(run).toHaveStatusCode(role === 'viewer' ? 403 : 200);
        if (role !== 'viewer') executionId = run.body.workflowExecutionId;
        await expect
          .poll(
            async () => {
              if (role === 'viewer') return 'denied';
              const execution = await apiClient.get(
                `s/${spaceId}/api/workflows/executions/${executionId}`,
                {
                  headers: readerHeaders,
                }
              );
              return execution.body.status;
            },
            { timeout: 60000 }
          )
          .toBe(role === 'viewer' ? 'denied' : 'completed');
        const edit = await apiClient.put(workflowPath, { headers: readerHeaders, body: { yaml } });
        expect(edit).toHaveStatusCode(role === 'editor' ? 200 : 403);
        const testDraft = await apiClient.post(`s/${spaceId}/api/workflows/test`, {
          headers: readerHeaders,
          body: { workflowId, workflowYaml: yaml, inputs: {} },
        });
        expect(testDraft).toHaveStatusCode(role === 'editor' ? 200 : 403);
        expect(
          await apiClient.put(accessPath, {
            headers: readerHeaders,
            body: { access_mode: 'public', entries: [] },
          })
        ).toHaveStatusCode(403);
      }

      expect(
        await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: { access_mode: 'public', entries: [] },
        })
      ).toHaveStatusCode(200);
      expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(200);
      expect(
        await apiClient.post(`${workflowPath}/run`, {
          headers: readerHeaders,
          body: { inputs: {} },
        })
      ).toHaveStatusCode(200);
      expect(
        await apiClient.put(workflowPath, { headers: readerHeaders, body: { yaml } })
      ).toHaveStatusCode(200);
      expect(
        await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: { access_mode: 'private', entries: [] },
        })
      ).toHaveStatusCode(200);
      expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(404);
      expect(executionId).toBeDefined();
      expect(
        await apiClient.get(`s/${spaceId}/api/workflows/executions/${executionId}`, {
          headers: readerHeaders,
        })
      ).toHaveStatusCode(404);
      const hiddenExecutions = await apiClient.get(
        `s/${spaceId}/api/workflows/workflow/executions`,
        {
          headers: readerHeaders,
        }
      );
      expect(hiddenExecutions).toHaveStatusCode(200);
      expect(hiddenExecutions.body.total).toBe(0);
    }
  );

  apiTest(
    'tests a disabled saved workflow without granting draft or edit access',
    async ({ apiClient }) => {
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      const testPath = `s/${spaceId}/api/workflows/test`;
      const disabledYaml = yaml.replace('enabled: true', 'enabled: false');
      expect(
        await apiClient.put(workflowPath, {
          headers: ownerHeaders,
          body: { yaml: disabledYaml },
        })
      ).toHaveStatusCode(200);

      for (const role of ['executor', 'viewer'] as const) {
        expect(
          await apiClient.put(`s/${spaceId}/internal/workflows/${workflowId}/access_control`, {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [{ type: 'user', id: readerProfileId, role }],
            },
          })
        ).toHaveStatusCode(200);
        const savedTest = await apiClient.post(testPath, {
          headers: readerHeaders,
          body: { workflowId, inputs: {} },
        });
        expect(savedTest).toHaveStatusCode(role === 'executor' ? 200 : 403);
        await expect
          .poll(
            async () => {
              if (role === 'viewer') return 'denied';
              const execution = await apiClient.get(
                `s/${spaceId}/api/workflows/executions/${savedTest.body.workflowExecutionId}`,
                { headers: readerHeaders }
              );
              return execution.body.status;
            },
            { timeout: 60000 }
          )
          .toBe(role === 'executor' ? 'completed' : 'denied');
        const normalRun = await apiClient.post(`${workflowPath}/run`, {
          headers: readerHeaders,
          body: { inputs: {} },
        });
        expect(normalRun).toHaveStatusCode(400);
        expect(normalRun.body.message).toBe('Workflow is disabled. Enable it to run it.');
        expect(
          await apiClient.post(testPath, {
            headers: readerHeaders,
            body: { workflowId, workflowYaml: disabledYaml, inputs: {} },
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.put(workflowPath, {
            headers: readerHeaders,
            body: { yaml },
          })
        ).toHaveStatusCode(403);
        const saved = await apiClient.get(workflowPath, { headers: readerHeaders });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.enabled).toBe(false);
        expect(saved.body.yaml).toBe(disabledYaml);
      }
    }
  );

  for (const { name, featureId, privileges, recipientSpace, canRead, canExecute, canEdit } of [
    {
      name: 'no Workflows access',
      featureId: 'dashboard_v2',
      privileges: ['read'],
      recipientSpace: spaceId,
      canRead: false,
      canExecute: false,
      canEdit: false,
    },
    {
      name: 'Workflows access in another space',
      featureId: 'workflowsManagement',
      privileges: ['all'],
      recipientSpace: 'default',
      canRead: false,
      canExecute: false,
      canEdit: false,
    },
    {
      name: 'Workflows Read access',
      featureId: 'workflowsManagement',
      privileges: ['read'],
      recipientSpace: spaceId,
      canRead: true,
      canExecute: false,
      canEdit: false,
    },
    {
      name: 'custom Workflows Read and Execute access',
      featureId: 'workflowsManagement',
      privileges: ['minimal_read', 'workflow_read', 'workflow_execute'],
      recipientSpace: spaceId,
      canRead: true,
      canExecute: true,
      canEdit: false,
    },
    {
      name: 'Workflows All access',
      featureId: 'workflowsManagement',
      privileges: ['all'],
      recipientSpace: spaceId,
      canRead: true,
      canExecute: true,
      canEdit: true,
    },
  ]) {
    apiTest(`checks suggestions and grants for ${name}`, async ({ apiClient, samlAuth }) => {
      const recipient = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { [featureId]: privileges }, spaces: [recipientSpace] }],
      });
      const profile = await apiClient.get('internal/security/user_profile', {
        headers: { ...headers, ...recipient.cookieHeader },
      });
      expect(profile).toHaveStatusCode(200);
      const suggestions = await apiClient.post(
        `s/${spaceId}/internal/workflows/_suggest_user_profiles`,
        {
          headers: ownerHeaders,
          body: { name: profile.body.user.username, size: 20 },
        }
      );
      expect(suggestions).toHaveStatusCode(200);
      expect(
        suggestions.body.map(({ uid }: { uid: string }) => uid).includes(profile.body.uid)
      ).toBe(canRead);

      for (const { role, allowed } of [
        { role: 'viewer', allowed: canRead },
        { role: 'executor', allowed: canExecute },
        { role: 'editor', allowed: canEdit },
      ]) {
        const grant = await apiClient.put(
          `s/${spaceId}/internal/workflows/${workflowId}/access_control`,
          {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [{ type: 'user', id: profile.body.uid, role }],
            },
          }
        );
        expect(grant).toHaveStatusCode(allowed ? 200 : 400);
      }
    });
  }
});
