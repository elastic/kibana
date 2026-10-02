/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/workflows';
import { spaceTest as test } from '../fixtures';
import { getDummyWorkflowYaml } from '../fixtures/workflows';

interface AccessUser {
  username: string;
  displayName: string;
}

test.describe('Workflow access dialog', { tag: tags.stateful.classic }, () => {
  let workflowId: string | undefined;
  let ownerHeaders: Record<string, string>;
  let editorUser: AccessUser;
  let viewerUser: AccessUser;

  test.beforeAll(async ({ scoutSpace, samlAuth }) => {
    await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
    const resolveUser = async (role: string): Promise<AccessUser> => {
      const { username, full_name: fullName, email } = await samlAuth.session.getUserData(role);
      // The access form labels users with `getUserDisplayName` and keys the role control on `username`.
      return { username, displayName: fullName || email || username };
    };
    [editorUser, viewerUser] = await Promise.all([resolveUser('editor'), resolveUser('viewer')]);
  });

  test.beforeEach(async () => {
    workflowId = undefined;
  });

  test.afterEach(async ({ apiClient, scoutSpace }) => {
    if (workflowId) {
      const response = await apiClient.delete(
        `s/${scoutSpace.id}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
        {
          headers: {
            ...ownerHeaders,
            'kbn-xsrf': 'scout',
            'elastic-api-version': '2023-10-31',
          },
        }
      );
      expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
    }
  });

  test.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('saves private and public access through the shared form', async ({
    page,
    pageObjects,
    browserAuth,
    samlAuth,
  }, testInfo) => {
    test.setTimeout(120_000);
    // Activate the recipient profile so it is available in the access picker.
    await samlAuth.asInteractiveUser('viewer');
    ownerHeaders = (await samlAuth.asInteractiveUser('editor')).cookieHeader;
    await browserAuth.loginAsPrivilegedUser();
    const editor = pageObjects.workflowEditor;
    await editor.gotoNewWorkflow();
    await editor.setYamlEditorValue(getDummyWorkflowYaml('Shared access form'));
    await editor.saveWorkflow();
    workflowId = new URL(page.url()).pathname.split('/').at(-1);
    if (!workflowId || workflowId === 'create') throw new Error('Workflow was not created');
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await expect(editor.accessMode).toContainText('Public');
    await expect(page.getByText('Owner (you)', { exact: true })).toBeVisible();
    await expect(page.getByText(editorUser.displayName, { exact: true })).toBeVisible();
    expect(
      (await page.checkA11y({ include: ['[aria-labelledby="workflowAccessTitle"]'] })).violations
    ).toStrictEqual([]);
    await editor.setAccessMode('private');
    await editor.addAccessUser(viewerUser.displayName);
    await editor.setAccessRole(viewerUser.username, 'executor');
    await page.testSubj.click('workflowAccessSave');
    await expect(
      page.getByText(
        'Selected users must have the Workflows privileges required for their access roles in this space.',
        { exact: true }
      )
    ).toBeVisible();
    await editor.setAccessRole(viewerUser.username, 'viewer');
    await expect(page.getByText('Owner (you)', { exact: true })).toBeVisible();
    expect(
      (await page.checkA11y({ include: ['[aria-labelledby="workflowAccessTitle"]'] })).violations
    ).toStrictEqual([]);
    await page.screenshot({
      path: testInfo.outputPath('workflow_access.png'),
      animations: 'disabled',
    });
    await editor.saveAccess();
    await editor.gotoWorkflow(workflowId);
    await editor.openAccessDialog();
    await expect(editor.accessMode).toContainText('Private');
    await expect(editor.accessRole(viewerUser.username)).toContainText('Viewer');
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
      samlAuth,
    }) => {
      test.setTimeout(120_000);
      const editor = pageObjects.workflowEditor;
      await samlAuth.asInteractiveUser('editor');
      ownerHeaders = (await samlAuth.asInteractiveUser('admin')).cookieHeader;
      await browserAuth.loginAsAdmin();
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
      await editor.addAccessUser(editorUser.displayName);
      await editor.setAccessRole(editorUser.username, 'executor');
      await editor.saveAccess();
      await browserAuth.loginAsPrivilegedUser();
      await editor.gotoWorkflow(workflowId);
      await expect(editor.saveButton).toBeDisabled();
      await editor.hoverDisabledAccessButton();
      await expect(page.testSubj.locator('workflowAccessButton')).toBeDisabled();
      await expect(
        page.getByText('Only the workflow owner can manage access.', { exact: true })
      ).toBeVisible();
      await page.keyboard.press('Escape');
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
      await expect
        .poll(async () => {
          const history = await page.request.get(
            `${new URL(page.url()).origin}/s/${
              scoutSpace.id
            }/api/workflows/workflow/${workflowId}/executions`,
            { headers: { 'elastic-api-version': '2023-10-31' } }
          );
          expect(history.status()).toBe(200);
          return (await history.json()).results.map(({ status }: { status: string }) => status);
        })
        .toStrictEqual(['completed']);
    });
  }
});
