/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { writeStep } from '../fixtures/service_account_permissions';
import {
  authenticationStep,
  createServiceAccountSuite,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: saved delegation permissions',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
    });
    let editorHeaders: Record<string, string>;
    let editorUsername: string;

    apiTest.beforeAll(async ({ requestAuth, apiClient, samlAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const editor = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: ['default'] }],
      });
      editorHeaders = {
        ...editor.apiKeyHeader,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      };
      const editorUser = await apiClient.get('internal/security/me', {
        headers: editorHeaders,
        responseType: 'json',
      });
      expect(editorUser).toHaveStatusCode(200);
      editorUsername = editorUser.body.username;
    });
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);

    apiTest(
      'an editor can manage ordinary workflows and execute saved delegation',
      async ({ apiClient, esClient }) => {
        const { headers, accountId, dataIndex, create, run, wait, expectAccount } = getContext();
        const yaml = workflowYaml(
          accountId,
          authenticationStep + writeStep(dataIndex, 'delegated')
        );
        const ordinaryId = await create(
          apiClient,
          yaml.replace(`settings:\n  run_as: ${accountId}\n`, ''),
          editorHeaders
        );
        const updated = await apiClient.put(`api/workflows/workflow/${ordinaryId}`, {
          headers: editorHeaders,
          body: { description: 'An ordinary workflow remains editable' },
          responseType: 'json',
        });
        expect(updated).toHaveStatusCode(200);
        const ordinary = await wait(
          apiClient,
          await run(apiClient, ordinaryId, editorHeaders),
          'failed'
        );
        expect(ordinary.effectiveIdentity).toBeUndefined();
        expect(JSON.stringify(ordinary.error)).toContain('security_exception');
        expect(await esClient.exists({ index: dataIndex, id: 'delegated' })).toBe(false);

        const boundId = await create(apiClient, yaml, headers);
        const delegated = await wait(apiClient, await run(apiClient, boundId, editorHeaders));
        expectAccount(delegated, accountId, { username: editorUsername });
        expect(delegated.stepExecutions?.find((step) => step.stepId === 'write')?.status).toBe(
          'completed'
        );
        expect(await esClient.exists({ index: dataIndex, id: 'delegated' })).toBe(true);
      }
    );

    for (const change of ['steps', 'unbind', 'rebind', 'disable', 'metadata'] as const) {
      apiTest(`an editor cannot change a bound workflow's ${change}`, async ({ apiClient }) => {
        const { headers, accountId, otherAccountId, create } = getContext();
        const yaml = workflowYaml(accountId);
        const id = await create(apiClient, yaml);
        const path = `api/workflows/workflow/${id}`;
        const before = await apiClient.get(path, { headers, responseType: 'json' });
        expect(before).toHaveStatusCode(200);
        const updates = {
          steps: { yaml: yaml.replace('name: authenticate', 'name: changed') },
          unbind: { yaml: yaml.replace(`settings:\n  run_as: ${accountId}\n`, '') },
          rebind: { yaml: yaml.replace(accountId, otherAccountId) },
          disable: { enabled: false },
          metadata: { description: 'This must not be saved' },
        };
        const denied = await apiClient.put(path, {
          headers: editorHeaders,
          body: updates[change],
          responseType: 'json',
        });
        expect(denied).toHaveStatusCode(403);
        expect(denied.body.message).toContain('manage_security');
        const after = await apiClient.get(path, { headers, responseType: 'json' });
        expect(after).toHaveStatusCode(200);
        expect(after.body).toStrictEqual(before.body);
      });
    }

    apiTest(
      'bulk overwrite cannot remove a saved service-account binding',
      async ({ apiClient }) => {
        const { headers, accountId, create, run, wait, expectAccount } = getContext();
        const yaml = workflowYaml(accountId);
        const id = await create(apiClient, yaml);
        const denied = await apiClient.post('api/workflows?overwrite=true', {
          headers: editorHeaders,
          body: {
            workflows: [{ id, yaml: yaml.replace(`settings:\n  run_as: ${accountId}\n`, '') }],
          },
          responseType: 'json',
        });
        expect(denied).toHaveStatusCode(200);
        expect(denied.body.created).toHaveLength(0);
        expect(denied.body.failed).toHaveLength(1);
        expect(JSON.stringify(denied.body.failed)).toContain('manage_security');
        const saved = await apiClient.get(`api/workflows/workflow/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.yaml).toBe(yaml);
        expectAccount(await wait(apiClient, await run(apiClient, id, editorHeaders)), accountId, {
          username: editorUsername,
        });
      }
    );

    apiTest(
      'an unbound draft cannot inherit the saved workflow account',
      async ({ apiClient, esClient }) => {
        const { headers, accountId, dataIndex, create, wait } = getContext();
        const yaml = workflowYaml(
          accountId,
          authenticationStep + writeStep(dataIndex, 'forbidden-draft')
        );
        const id = await create(apiClient, yaml);
        const started = await apiClient.post('api/workflows/test', {
          headers: editorHeaders,
          body: {
            workflowId: id,
            workflowYaml: yaml.replace(`settings:\n  run_as: ${accountId}\n`, ''),
            inputs: {},
          },
          responseType: 'json',
        });
        expect(started).toHaveStatusCode(200);
        const execution = await wait(apiClient, started.body.workflowExecutionId, 'failed');
        expect(execution.effectiveIdentity).toBeUndefined();
        const authentication = execution.stepExecutions?.find(
          (step) => step.stepId === 'authenticate'
        );
        expect(authentication?.status).toBe('completed');
        expect(JSON.stringify(authentication?.output)).not.toContain(accountId);
        expect(
          JSON.stringify(execution.stepExecutions?.find((step) => step.stepId === 'write')?.error)
        ).toContain('security_exception');
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-draft' })).toBe(false);
        const saved = await apiClient.get(`api/workflows/workflow/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.yaml).toBe(yaml);
      }
    );
  }
);
