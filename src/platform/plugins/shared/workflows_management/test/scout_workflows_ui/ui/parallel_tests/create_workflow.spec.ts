/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect, KibanaCodeEditorWrapper, tags, spaceTest as test } from '@kbn/scout';

const demoYaml = `
name: Dummy workflow
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

  test('should display dashboard', async ({ pageObjects, page }) => {
    // await pageObjects.collapsibleNav.clickItem('Workflows');
    await page.gotoApp('workflows');
    await page.testSubj.click('createWorkflowButton');
    const yamlEditor = page.testSubj.locator('workflowYamlEditor');
    const kbnCodeEditorWrapper = new KibanaCodeEditorWrapper(page);
    await expect(yamlEditor).toBeVisible();
    await kbnCodeEditorWrapper.setCodeEditorValue(demoYaml);
    // await setYamlEditorValue(page, demoYaml);
    console.log('current value', await kbnCodeEditorWrapper.getCodeEditorValue());
    await page.testSubj.click('saveWorkflowHeaderButton');
    // await page.keyboard.press('ControlOrMeta+S');
    await page.testSubj.waitForSelector('workflowSavedChangesBadge');
    await page.gotoApp('workflows');
    await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
    await expect(page.getByRole('link', { name: 'Dummy workflow' })).toBeVisible();
  });
});
async function setYamlEditorValue(page: ScoutPage, yaml: string) {
  // Clean previous content
  await page.getByTestId('workflowYamlEditor').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  // Fill with new condition
  await page.getByTestId('workflowYamlEditor').getByRole('textbox').fill(yaml);
  // Clean trailing content
  await this.page.keyboard.press('Shift+Control+ArrowDown');
  await this.page.keyboard.press('Backspace');
}
