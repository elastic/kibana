/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, KibanaCodeEditorWrapper, tags, spaceTest as test } from '@kbn/scout';

const getDummyWorkflowYaml = (name: string) => `
name: ${name}
description: Dummy workflow description
enabled: true
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ inputs.message }}"
`;

test.describe('Create and save a workflow', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should display dashboard', async ({ page }) => {
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');
    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    const kbnCodeEditorWrapper = new KibanaCodeEditorWrapper(page);
    await expect(yamlEditor).toBeVisible();

    const workflowName = `Dummy workflow ${Math.floor(Math.random() * 1000)}`;

    // Set the editor value
    await kbnCodeEditorWrapper.setCodeEditorValue(getDummyWorkflowYaml(workflowName));

    // Now the save button should be enabled and clicking it will save the correct value
    await page.testSubj.click('saveWorkflowHeaderButton');
    await page.testSubj.waitForSelector('workflowSavedChangesBadge');
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
    await expect(page.getByRole('link', { name: workflowName })).toBeVisible();
  });
});
