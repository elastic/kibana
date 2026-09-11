/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import { spaceTest as test } from '../fixtures';
import { getDummyWorkflowYaml } from '../fixtures/workflows';

test.describe('Workflow access dialog', { tag: tags.stateful.classic }, () => {
  let workflowId: string | undefined;
  let isAdminOwner = false;

  test.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
  });

  test.beforeEach(async () => {
    workflowId = undefined;
    isAdminOwner = false;
  });

  test.afterEach(async ({ browserAuth, page, scoutSpace }) => {
    if (workflowId) {
      if (isAdminOwner) await browserAuth.loginAsAdmin();
      const origin = new URL(page.url()).origin;
      const response = await page.request.delete(
        `${origin}/s/${scoutSpace.id}/api/workflows/workflow/${workflowId}`,
        { headers: { 'kbn-xsrf': 'scout', 'elastic-api-version': '2023-10-31' } }
      );
      expect(response.status()).toBe(200);
    }
  });

  test.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('saves private and public access through the shared form', async ({
    page,
    pageObjects,
    esClient,
    scoutSpace,
    browserAuth,
  }, testInfo) => {
    test.setTimeout(120_000);
    await browserAuth.loginAsViewer();
    await browserAuth.loginAsPrivilegedUser();
    const editor = pageObjects.workflowEditor;
    await editor.gotoNewWorkflow();
    await editor.setYamlEditorValue(getDummyWorkflowYaml('Shared access form'));
    await editor.saveWorkflow();
    workflowId = new URL(page.url()).pathname.split('/').at(-1);
    if (!workflowId || workflowId === 'create') throw new Error('Workflow was not created');
    // Simulate a workflow created before owner profiles and access controls were stored.
    const fixtureUser = `workflow_legacy_${randomUUID()}`;
    await esClient.security.putRole({
      name: fixtureUser,
      indices: [
        {
          names: ['.workflows-workflows*'],
          privileges: ['read', 'write', 'maintenance'],
          allow_restricted_indices: true,
        },
      ],
    });
    try {
      await esClient.security.putUser({
        username: fixtureUser,
        password: randomUUID(),
        roles: [fixtureUser],
      });
      const legacyWorkflow = await esClient.updateByQuery(
        {
          index: '.workflows-workflows',
          query: {
            bool: {
              filter: [{ ids: { values: [workflowId] } }, { term: { spaceId: scoutSpace.id } }],
            },
          },
          script: {
            source: 'ctx._source.remove("owner_id"); ctx._source.remove("access_control");',
          },
          refresh: true,
        },
        { headers: { 'es-security-runas-user': fixtureUser } }
      );
      expect(legacyWorkflow.updated).toBe(1);
    } finally {
      await esClient.security.deleteUser({ username: fixtureUser });
      await esClient.security.deleteRole({ name: fixtureUser });
    }
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await expect(editor.accessMode).toContainText('Public');
    await expect(page.getByText('Owner (you)', { exact: true })).toBeVisible();
    await expect(page.getByText('test editor', { exact: true })).toBeVisible();
    await editor.setAccessMode('private');
    await editor.addAccessUser('test viewer');
    await editor.setAccessRole('elastic_viewer', 'executor');
    await page.testSubj.click('workflowAccessSave');
    await expect(
      page.getByText(
        'Selected users must have the Workflows privileges required for their access roles in this space.',
        { exact: true }
      )
    ).toBeVisible();
    await editor.setAccessRole('elastic_viewer', 'viewer');
    await expect(page.getByText('Owner (you)', { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('workflow_access.png'),
      animations: 'disabled',
    });
    await editor.saveAccess();
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await expect(editor.accessMode).toContainText('Private');
    await expect(editor.accessRole('elastic_viewer')).toContainText('Viewer');
    await editor.setAccessMode('public');
    await editor.saveAccess();
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await expect(editor.accessMode).toContainText('Public');
  });

  for (const enabled of [true, false]) {
    test(`lets an executor test a saved workflow with enabled=${enabled}`, async ({
      browserAuth,
      pageObjects,
      page,
      scoutSpace,
    }) => {
      test.setTimeout(120_000);
      const editor = pageObjects.workflowEditor;
      await browserAuth.loginAsPrivilegedUser();
      await browserAuth.loginAsAdmin();
      isAdminOwner = true;
      await editor.gotoNewWorkflow();
      await editor.setYamlEditorValue(
        getDummyWorkflowYaml('Executor access').replace('enabled: true', `enabled: ${enabled}`)
      );
      await editor.saveWorkflow();
      workflowId = new URL(page.url()).pathname.split('/').at(-1);
      if (!workflowId || workflowId === 'create') throw new Error('Workflow was not created');
      await editor.gotoWorkflow(workflowId);
      await editor.openAccessDialog();
      await editor.setAccessMode('private');
      await editor.addAccessUser('test editor');
      await editor.setAccessRole('elastic_editor', 'executor');
      await editor.saveAccess();
      await browserAuth.loginAsPrivilegedUser();
      await editor.gotoWorkflow(workflowId);
      await expect(editor.saveButton).toBeDisabled();
      await expect(page.testSubj.locator('workflowBottomBarRunButton')).toBeEnabled();
      await editor.executeWorkflowFromBottomBar({ message: 'Executor run' });
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', 60000);
      const saved = await page.request.get(
        `${new URL(page.url()).origin}/s/${scoutSpace.id}/api/workflows/workflow/${workflowId}`,
        { headers: { 'elastic-api-version': '2023-10-31' } }
      );
      expect(saved.status()).toBe(200);
      expect(await saved.json()).toMatchObject({
        enabled,
        permissions: { execute: true, edit: false },
      });
    });
  }
});
