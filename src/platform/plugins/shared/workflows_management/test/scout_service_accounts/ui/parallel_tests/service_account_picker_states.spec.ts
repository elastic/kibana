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
});
