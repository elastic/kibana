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

test.describe('Workflow administrator sharing', { tag: tags.stateful.classic }, () => {
  let workflowId: string;
  let ownerId: string;
  let ownerHeaders: Record<string, string>;
  let admin: { username: string; displayName: string };

  test.beforeAll(async ({ apiClient, scoutSpace, samlAuth }) => {
    const { username, full_name: fullName, email } = await samlAuth.session.getUserData('admin');
    admin = { username, displayName: fullName || email || username };
    await scoutSpace.uiSettings.set({ [WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID]: true });
    ownerHeaders = {
      ...(await samlAuth.asInteractiveUser('editor')).cookieHeader,
      'kbn-xsrf': 'scout',
      'x-elastic-internal-origin': 'kibana',
      'elastic-api-version': '2023-10-31',
    };
    const created = await apiClient.post(`s/${scoutSpace.id}/api/workflows/workflow`, {
      headers: ownerHeaders,
      body: { yaml: getDummyWorkflowYaml('Administrator sharing') },
    });
    expect(created.statusCode).toBe(200);
    workflowId = created.body.id;
    const access = await apiClient.put(
      `s/${scoutSpace.id}/internal/workflows/${workflowId}/access_control`,
      { headers: ownerHeaders, body: { access_mode: 'private', entries: [] } }
    );
    expect(access.statusCode).toBe(200);
    ownerId = access.body.owner_id;
  });

  test.afterAll(async ({ apiClient, scoutSpace }) => {
    if (workflowId) {
      const deleted = await apiClient.delete(
        `s/${scoutSpace.id}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
        { headers: ownerHeaders }
      );
      expect(deleted.statusCode).toBe(200);
    }
    await scoutSpace.uiSettings.unset(WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID);
    await scoutSpace.savedObjects.cleanStandardList();
  });

  test('grants execution access through Access control and preserves the owner', async ({
    apiClient,
    browserAuth,
    page,
    pageObjects,
    scoutSpace,
  }, testInfo) => {
    await browserAuth.loginAsAdmin();
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await expect(page.testSubj.locator('workflowBottomBarRunButton')).toBeDisabled();
    await editor.openAccessDialog();
    await expect(page.getByRole('heading', { name: 'Access control', exact: true })).toBeVisible();
    await expect(page.getByText("You are editing another user's access settings")).toBeVisible();
    await editor.addAccessUser(admin.displayName);
    await editor.setAccessRole(admin.username, 'executor');
    await page.screenshot({
      path: testInfo.outputPath('administrator_sharing.png'),
      animations: 'disabled',
    });
    await editor.saveAccess();
    await expect(page.testSubj.locator('workflowBottomBarRunButton')).toBeEnabled();
    await expect(editor.saveButton).toBeDisabled();
    const saved = await apiClient.get(`s/${scoutSpace.id}/api/workflows/workflow/${workflowId}`, {
      headers: ownerHeaders,
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.body.owner_id).toBe(ownerId);
    expect(saved.body.access_control.entries).toStrictEqual([
      expect.objectContaining({ type: 'user', role: 'executor' }),
    ]);
  });
});
