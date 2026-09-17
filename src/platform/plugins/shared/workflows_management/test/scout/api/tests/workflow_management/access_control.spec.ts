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
import type { WorkflowExecutionDto } from '@kbn/workflows';

apiTest.describe('Workflow access control', { tag: tags.stateful.classic }, () => {
  const spaceId = `workflow-acl-${randomUUID()}`;
  const ownerUsername = `workflow-owner-${randomUUID()}`;
  const readerUsername = `workflow-reader-${randomUUID()}`;
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

  apiTest.beforeAll(async ({ apiClient, kbnClient, esClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/api/spaces/space',
      body: { id: spaceId, name: spaceId },
    });
    await kbnClient.request({
      method: 'PUT',
      path: `/api/security/role/${ownerUsername}`,
      body: {
        elasticsearch: { cluster: [] },
        kibana: [
          {
            base: [],
            feature: { workflowsManagement: ['all'], agentBuilder: ['read'] },
            spaces: [spaceId],
          },
        ],
      },
    });
    const ownerPassword = randomUUID();
    await esClient.security.putUser({
      username: ownerUsername,
      password: ownerPassword,
      roles: [ownerUsername],
    });
    const readerPassword = randomUUID();
    await esClient.security.putUser({
      username: readerUsername,
      password: readerPassword,
      roles: [ownerUsername],
    });
    ownerHeaders = {
      ...headers,
      Authorization: `Basic ${Buffer.from(`${ownerUsername}:${ownerPassword}`).toString('base64')}`,
    };
    readerHeaders = {
      ...headers,
      Authorization: `Basic ${Buffer.from(`${readerUsername}:${readerPassword}`).toString(
        'base64'
      )}`,
    };
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

  apiTest.afterAll(async ({ apiClient, kbnClient, esClient }) => {
    if (workflowId) {
      await apiClient.delete(`s/${spaceId}/api/workflows/workflow/${workflowId}`, {
        headers: ownerHeaders,
      });
    }
    await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
    await esClient.security.deleteUser({ username: readerUsername });
    await esClient.security.deleteUser({ username: ownerUsername });
    await esClient.security.deleteRole({ name: ownerUsername });
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
      const suggestPath = `s/${spaceId}/internal/workflows/${workflowId}/_suggest_user_profiles`;
      expect(
        await apiClient.post(suggestPath, {
          headers: readerHeaders,
          body: { name: '', size: 10 },
        })
      ).toHaveStatusCode(403);
      expect(
        await apiClient.post(suggestPath, {
          headers: ownerHeaders,
          body: { name: '', size: 10 },
        })
      ).toHaveStatusCode(200);
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
        expect(shared.body.access_control.entries[0].added_at).toBeDefined();
        const read = await apiClient.get(workflowPath, { headers: readerHeaders });
        expect(read).toHaveStatusCode(200);
        expect(read.body.access_control).toBeUndefined();
        expect(read.body.owner_id).toBeUndefined();
        const partial = await apiClient.post(`s/${spaceId}/api/workflows/mget`, {
          headers: readerHeaders,
          body: { ids: [workflowId], source: ['access_control', 'owner_id'] },
        });
        expect(partial).toHaveStatusCode(200);
        expect(partial.body).toStrictEqual([{ id: workflowId }]);
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

  for (const stepType of ['workflow.execute', 'workflow.executeAsync']) {
    for (const isTestRun of [false, true]) {
      apiTest(
        `Executor ${
          isTestRun ? 'tests' : 'runs'
        } a saved parent and private child with ${stepType}`,
        async ({ apiClient }) => {
          const createdIds: string[] = [];
          const createSharedWorkflow = async (workflowYaml: string) => {
            const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
              headers: ownerHeaders,
              body: { yaml: workflowYaml },
            });
            expect(created).toHaveStatusCode(200);
            const id: string = created.body.id;
            createdIds.push(id);
            expect(
              await apiClient.put(`s/${spaceId}/internal/workflows/${id}/access_control`, {
                headers: ownerHeaders,
                body: {
                  access_mode: 'private',
                  entries: [{ type: 'user', id: readerProfileId, role: 'executor' }],
                },
              })
            ).toHaveStatusCode(200);
            return id;
          };
          try {
            const childId = await createSharedWorkflow(yaml);
            const parentId = await createSharedWorkflow(`name: Private parent
enabled: true
triggers:
  - type: manual
steps:
  - name: child
    type: ${stepType}
    with:
      workflow-id: ${childId}
      inputs: {}
`);
            const result = await apiClient.post(
              isTestRun
                ? `s/${spaceId}/api/workflows/test`
                : `s/${spaceId}/api/workflows/workflow/${parentId}/run`,
              {
                headers: readerHeaders,
                body: isTestRun ? { workflowId: parentId, inputs: {} } : { inputs: {} },
              }
            );
            expect(result).toHaveStatusCode(200);
            await expect
              .poll(
                async () => {
                  const parent = await apiClient.get(
                    `s/${spaceId}/api/workflows/executions/${result.body.workflowExecutionId}`,
                    { headers: readerHeaders }
                  );
                  expect(parent).toHaveStatusCode(200);
                  const children = await apiClient.get(
                    `s/${spaceId}/api/workflows/workflow/${childId}/executions`,
                    { headers: readerHeaders }
                  );
                  expect(children).toHaveStatusCode(200);
                  return {
                    parent: parent.body.status,
                    children: children.body.results.map((execution: WorkflowExecutionDto) => ({
                      status: execution.status,
                      isTestRun: execution.isTestRun,
                    })),
                  };
                },
                { timeout: 60000 }
              )
              .toStrictEqual({
                parent: 'completed',
                children: [{ status: 'completed', isTestRun }],
              });
          } finally {
            for (const id of createdIds.reverse()) {
              expect(
                await apiClient.delete(`s/${spaceId}/api/workflows/workflow/${id}`, {
                  headers: ownerHeaders,
                })
              ).toHaveStatusCode(200);
            }
          }
        }
      );
    }
  }

  apiTest(
    'runs a private workflow on its schedule using the stored API key',
    async ({ apiClient }) => {
      apiTest.setTimeout(120_000);
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      const scheduledYaml = yaml
        .replace('enabled: true', 'enabled: false')
        .replace('type: manual', 'type: scheduled\n    with:\n      every: 1m');
      expect(
        await apiClient.put(workflowPath, { headers: ownerHeaders, body: { yaml: scheduledYaml } })
      ).toHaveStatusCode(200);
      expect(
        await apiClient.put(`s/${spaceId}/internal/workflows/${workflowId}/access_control`, {
          headers: ownerHeaders,
          body: { access_mode: 'private', entries: [] },
        })
      ).toHaveStatusCode(200);
      try {
        expect(
          await apiClient.put(workflowPath, { headers: ownerHeaders, body: { enabled: true } })
        ).toHaveStatusCode(200);
        await expect
          .poll(
            async () => {
              const executions = await apiClient.get(`${workflowPath}/executions`, {
                headers: ownerHeaders,
              });
              expect(executions).toHaveStatusCode(200);
              return executions.body.results.find(
                (execution: WorkflowExecutionDto) => execution.triggeredBy === 'scheduled'
              )?.status;
            },
            { timeout: 90_000 }
          )
          .toBe('completed');
      } finally {
        expect(
          await apiClient.put(workflowPath, { headers: ownerHeaders, body: { yaml } })
        ).toHaveStatusCode(200);
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
        `s/${spaceId}/internal/workflows/${workflowId}/_suggest_user_profiles`,
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
  apiTest(
    'passes the caller identity through Agent Builder status and execution lists',
    async ({ apiClient, esClient }) => {
      const bob = `workflow-unlisted-${randomUUID()}`;
      const password = randomUUID();
      await esClient.security.putUser({ username: bob, password, roles: [ownerUsername] });
      const bobHeaders = {
        ...headers,
        Authorization: `Basic ${Buffer.from(`${bob}:${password}`).toString('base64')}`,
      };
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
      try {
        expect(
          await apiClient.put(workflowPath, { headers: ownerHeaders, body: { yaml } })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(accessPath, {
            headers: ownerHeaders,
            body: { access_mode: 'public', entries: [] },
          })
        ).toHaveStatusCode(200);
        const run = await apiClient.post(`${workflowPath}/run`, {
          headers: ownerHeaders,
          body: { inputs: {} },
        });
        expect(run).toHaveStatusCode(200);
        const executionId = run.body.workflowExecutionId;
        await expect
          .poll(
            async () => {
              const result = await apiClient.get(
                `s/${spaceId}/api/workflows/executions/${executionId}`,
                { headers: ownerHeaders }
              );
              return result.body.status;
            },
            { timeout: 60000 }
          )
          .toBe('completed');
        for (const mode of ['public', 'private'] as const) {
          expect(
            await apiClient.put(accessPath, {
              headers: ownerHeaders,
              body: {
                access_mode: mode,
                entries:
                  mode === 'private'
                    ? [{ type: 'user', id: readerProfileId, role: 'executor' }]
                    : [],
              },
            })
          ).toHaveStatusCode(200);
          for (const callerHeaders of [ownerHeaders, readerHeaders, bobHeaders]) {
            const allowed = mode === 'public' || callerHeaders !== bobHeaders;
            const status = await apiClient.post(`s/${spaceId}/api/agent_builder/tools/_execute`, {
              headers: callerHeaders,
              body: {
                tool_id: 'platform.core.get_workflow_execution_status',
                tool_params: { executionId },
              },
            });
            expect(status).toHaveStatusCode(200);
            expect(status.body.results[0].type).toBe(allowed ? 'other' : 'error');
            expect(status.body.results[0].data.execution?.status).toBe(
              allowed ? 'completed' : undefined
            );
            const listed = await apiClient.post(`s/${spaceId}/api/agent_builder/tools/_execute`, {
              headers: callerHeaders,
              body: {
                tool_id: 'platform.core.list_workflow_executions',
                tool_params: { workflowId, limit: 50 },
              },
            });
            expect(listed).toHaveStatusCode(200);
            const ids = listed.body.results[0].data.executions.map(
              (execution: { executionId: string }) => execution.executionId
            );
            expect(ids.includes(executionId)).toBe(allowed);
          }
        }
      } finally {
        await esClient.security.deleteUser({ username: bob });
      }
    }
  );

  apiTest(
    'allows revocation and permission decreases after another recipient loses RBAC',
    async ({ apiClient, esClient }) => {
      const bob = `workflow-revoked-${randomUUID()}`;
      const password = randomUUID();
      await esClient.security.putUser({ username: bob, password, roles: [ownerUsername] });
      const bobHeaders = {
        ...headers,
        Authorization: `Basic ${Buffer.from(`${bob}:${password}`).toString('base64')}`,
      };
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${workflowId}`;
      const accessPath = `s/${spaceId}/internal/workflows/${workflowId}/access_control`;
      try {
        const profile = await apiClient.get('internal/security/user_profile', {
          headers: bobHeaders,
        });
        expect(profile).toHaveStatusCode(200);
        const bobEntry = { type: 'user', id: profile.body.uid, role: 'editor' };
        expect(
          await apiClient.put(accessPath, {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [bobEntry, { type: 'user', id: readerProfileId, role: 'viewer' }],
            },
          })
        ).toHaveStatusCode(200);
        await esClient.security.putUser({ username: bob, roles: [] });
        const refreshedProfile = await apiClient.get('internal/security/user_profile', {
          headers: bobHeaders,
        });
        expect(refreshedProfile).toHaveStatusCode(200);
        expect(refreshedProfile.body.user.roles).toStrictEqual([]);
        expect(await apiClient.get(workflowPath, { headers: bobHeaders })).toHaveStatusCode(403);
        const removed = await apiClient.put(accessPath, {
          headers: ownerHeaders,
          body: {
            access_mode: 'private',
            entries: [bobEntry],
          },
        });
        expect(removed).toHaveStatusCode(200);
        expect(
          removed.body.access_control.entries.map((entry: { id: string }) => entry.id)
        ).toStrictEqual([profile.body.uid]);
        expect(await apiClient.get(workflowPath, { headers: readerHeaders })).toHaveStatusCode(404);
        expect(await apiClient.get(workflowPath, { headers: bobHeaders })).toHaveStatusCode(403);
        expect(
          await apiClient.put(accessPath, {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [{ ...bobEntry, role: 'viewer' }],
            },
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(accessPath, {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [bobEntry],
            },
          })
        ).toHaveStatusCode(400);
      } finally {
        await esClient.security.deleteUser({ username: bob });
      }
    }
  );

  apiTest(
    'retains ACLs after soft delete and requires confirmation for hard delete',
    async ({ apiClient }) => {
      const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
        headers: ownerHeaders,
        body: { yaml },
      });
      expect(created).toHaveStatusCode(200);
      const deletedId = created.body.id;
      const workflowPath = `s/${spaceId}/api/workflows/workflow/${deletedId}`;
      try {
        expect(
          await apiClient.put(`s/${spaceId}/internal/workflows/${deletedId}/access_control`, {
            headers: ownerHeaders,
            body: { access_mode: 'private', entries: [] },
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.put(`s/${spaceId}/internal/workflows/${deletedId}/access_control`, {
            headers: ownerHeaders,
            body: {
              access_mode: 'private',
              entries: [{ type: 'user', id: readerProfileId, role: 'editor' }],
            },
          })
        ).toHaveStatusCode(200);
        expect(
          await apiClient.delete(`${workflowPath}?force=true&acknowledgeAclLoss=true`, {
            headers: readerHeaders,
          })
        ).toHaveStatusCode(403);
        expect(
          await apiClient.put(`s/${spaceId}/internal/workflows/${deletedId}/access_control`, {
            headers: ownerHeaders,
            body: { access_mode: 'private', entries: [] },
          })
        ).toHaveStatusCode(200);
        const run = await apiClient.post(`${workflowPath}/run`, {
          headers: ownerHeaders,
          body: { inputs: {} },
        });
        expect(run).toHaveStatusCode(200);
        const executionPath = `s/${spaceId}/api/workflows/executions/${run.body.workflowExecutionId}`;
        await expect
          .poll(
            async () => {
              const executions = await apiClient.get(`${workflowPath}/executions`, {
                headers: ownerHeaders,
              });
              expect(executions).toHaveStatusCode(200);
              return executions.body.results.find(
                (execution: WorkflowExecutionDto) => execution.id === run.body.workflowExecutionId
              )?.status;
            },
            { timeout: 60000 }
          )
          .toBe('completed');
        expect(await apiClient.delete(workflowPath, { headers: ownerHeaders })).toHaveStatusCode(
          200
        );
        expect(await apiClient.get(executionPath, { headers: ownerHeaders })).toHaveStatusCode(200);
        expect(await apiClient.get(executionPath, { headers: readerHeaders })).toHaveStatusCode(
          404
        );
        const ownerHistory = await apiClient.get(`${workflowPath}/executions`, {
          headers: ownerHeaders,
        });
        expect(ownerHistory).toHaveStatusCode(200);
        expect(ownerHistory.body.results).toStrictEqual([
          expect.objectContaining({ id: run.body.workflowExecutionId }),
        ]);
        const readerHistory = await apiClient.get(`${workflowPath}/executions`, {
          headers: readerHeaders,
        });
        expect(readerHistory).toHaveStatusCode(200);
        expect(readerHistory.body.results).toStrictEqual([]);
        expect(readerHistory.body.total).toBe(0);
        const warning = await apiClient.delete(`${workflowPath}?force=true`, {
          headers: ownerHeaders,
        });
        expect(warning).toHaveStatusCode(409);
        expect(warning.body.message).toContain('acknowledgeAclLoss=true');
        expect(await apiClient.get(executionPath, { headers: ownerHeaders })).toHaveStatusCode(200);
        expect(
          await apiClient.delete(`${workflowPath}?force=true&acknowledgeAclLoss=true`, {
            headers: ownerHeaders,
          })
        ).toHaveStatusCode(200);
        expect(await apiClient.get(executionPath, { headers: ownerHeaders })).toHaveStatusCode(404);
      } finally {
        await apiClient.delete(workflowPath, { headers: ownerHeaders });
      }
    }
  );

  apiTest('keeps unsaved test executions accessible', async ({ apiClient }) => {
    const run = await apiClient.post(`s/${spaceId}/api/workflows/test`, {
      headers: readerHeaders,
      body: { workflowYaml: yaml, inputs: {} },
    });
    expect(run).toHaveStatusCode(200);
    const executionPath = `s/${spaceId}/api/workflows/executions/${run.body.workflowExecutionId}`;
    await expect
      .poll(
        async () => {
          const execution = await apiClient.get(executionPath, { headers: readerHeaders });
          expect(execution).toHaveStatusCode(200);
          return execution.body.status;
        },
        { timeout: 60000 }
      )
      .toBe('completed');
    expect(
      await apiClient.get(`${executionPath}/logs`, { headers: readerHeaders })
    ).toHaveStatusCode(200);
    const listed = await apiClient.get(`s/${spaceId}/api/workflows/workflow/executions`, {
      headers: readerHeaders,
    });
    expect(listed).toHaveStatusCode(200);
    expect(listed.body.results.map((execution: WorkflowExecutionDto) => execution.id)).toContain(
      run.body.workflowExecutionId
    );
  });
});
