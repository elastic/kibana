/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, workflowYaml } from '../fixtures';

test.describe('Service account picker states', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('opens from the empty prompt and preserves YAML when focusing Manage', async ({
    pageObjects,
    workflowId,
    page,
    directoryState,
  }, testInfo) => {
    directoryState.set('ready');
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.openServiceAccountPicker(workflowYaml);
    await editor.dismissYamlSuggestions();
    const yaml = await editor.getYamlEditorValue();
    await editor.clickServiceAccountPlaceholder();
    await expect(editor.serviceAccountPopup.getByRole('listbox')).toBeVisible();
    await editor.focusServiceAccountControls();
    const manage = editor.serviceAccountPopup.getByRole('link', { name: /Manage/ });
    await expect(manage).toBeFocused();
    await expect(manage).toHaveAttribute('target', '_blank');
    expect(await editor.getYamlEditorValue()).toBe(yaml);
    await page.screenshot({ path: testInfo.outputPath('service-account-picker.png') });
    await editor.dismissYamlSuggestions();
    await expect(editor.serviceAccountPopup).toBeHidden();
  });

  test('explains denied directory access instead of claiming the directory is empty', async ({
    pageObjects,
    workflowId,
    directoryState,
    page,
  }, testInfo) => {
    directoryState.set('forbidden');
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.focusServiceAccountSetting(workflowYaml);
    await expect(editor.serviceAccountPopup).toContainText('Ask your administrator for access.');
    await expect(editor.serviceAccountPopup.getByRole('link', { name: /Manage/ })).toBeHidden();
    await expect(
      editor.serviceAccountPopup.getByRole('link', { name: /Learn more about permissions/ })
    ).toBeVisible();
    await expect(
      editor.yamlEditor.getByText('Select service account', { exact: true })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('service-account-picker-restricted.png') });
  });

  test('retries a temporary failure and selects the recovered account', async ({
    pageObjects,
    workflowId,
    directoryState,
    serviceAccount,
  }) => {
    directoryState.set('unavailable');
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.focusServiceAccountSetting(workflowYaml);
    await expect(editor.serviceAccountPopup.getByRole('alert')).toHaveText(
      'Unable to load service accounts.'
    );
    directoryState.set('ready');
    await editor.retryServiceAccounts();
    await expect(editor.serviceAccountOption(`${serviceAccount.name} viewer`)).toBeVisible();
    await editor.selectServiceAccount(`${serviceAccount.name} viewer`);
    await editor.openExistingServiceAccountPicker(serviceAccount.id);
    await expect(editor.serviceAccountOption(`${serviceAccount.name} viewer`)).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  test('shows a genuinely empty directory without permission guidance', async ({
    pageObjects,
    workflowId,
    directoryState,
  }) => {
    directoryState.set('empty');
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.focusServiceAccountSetting(workflowYaml);
    await expect(editor.serviceAccountPopup).toContainText(
      'No service accounts available to run this workflow.'
    );
    await expect(editor.serviceAccountPopup.getByText(/Ask your administrator/)).toBeHidden();
  });

  test('creates through the shared flyout and keeps the workflow unsaved', async ({
    pageObjects,
    workflowId,
    apiServices,
    page,
    kbnClient,
    createdAccountIds,
  }, testInfo) => {
    const editor = pageObjects.workflowEditor;
    const saved = await apiServices.workflows.getWorkflow(workflowId);
    await editor.gotoWorkflow(workflowId);
    await editor.openServiceAccountPicker(workflowYaml);
    const draft = await editor.getYamlEditorValue();
    await editor.openCreateServiceAccount();
    await editor.cancelCreateServiceAccount();
    expect(await editor.getYamlEditorValue()).toBe(draft);
    await editor.openServiceAccountPicker(workflowYaml);
    await editor.openCreateServiceAccount();
    const name = `scout-create-${randomUUID()}`;
    const description = 'Reads events for investigation workflows.';
    await editor.fillServiceAccount(name, description);
    await page.screenshot({ path: testInfo.outputPath('service-account-create-flyout.png') });
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/internal/security/service_account') &&
        response.request().method() === 'POST'
    );
    await editor.submitServiceAccount();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const account = await response.json();
    createdAccountIds.push(account.id);
    expect(account.description).toBe(description);
    expect(await editor.getYamlEditorValue()).toContain(JSON.stringify(account.id));
    expect((await apiServices.workflows.getWorkflow(workflowId)).yaml).toBe(saved.yaml);
    const directory = await kbnClient.request<{ description: string }>({
      method: 'GET',
      path: `/internal/security/service_account/${encodeURIComponent(account.id)}`,
    });
    expect(directory.data.description).toBe(description);
    await editor.openExistingServiceAccountPicker(account.id);
    await expect(editor.serviceAccountOption(`${name} ${description} viewer`)).toBeVisible();
    await expect(
      editor.serviceAccountPopup.getByRole('button', { name: 'Create account' })
    ).toBeInViewport();
    await expect.poll(() => editor.getServiceAccountBadgeText()).toContain(name);
    await expect(
      editor.yamlEditor.getByText('Select service account', { exact: true })
    ).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('service-account-picker-description.png') });
  });

  test('shows the actual workflow-only user flow without security privileges', async ({
    browserAuth,
    pageObjects,
    workflowId,
    page,
  }, testInfo) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [
        {
          base: [],
          feature: { workflowsManagement: ['all'], agentBuilder: ['read'] },
          spaces: ['*'],
        },
      ],
    });
    const editor = pageObjects.workflowEditor;
    await editor.gotoWorkflow(workflowId);
    await editor.focusServiceAccountSetting(workflowYaml);
    await expect(editor.serviceAccountPopup).toContainText('Ask your administrator for access.');
    await expect(editor.serviceAccountPopup.getByRole('link', { name: /Manage/ })).toBeHidden();
    await expect(
      editor.serviceAccountPopup.getByRole('button', { name: 'Create account' })
    ).toBeHidden();
    await expect(
      editor.serviceAccountPopup.getByRole('link', { name: /Learn more about permissions/ })
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('service-account-real-restricted-user.png'),
    });
  });
});
