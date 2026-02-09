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
import { spaceTest as test } from '../../fixtures';
import { nationalParksWorkflow } from '../../fixtures/workflows';

test.describe('InternalActions/Elasticsearch', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should run national park workflow successfully', async ({ page, pageObjects }) => {
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(nationalParksWorkflow);
    await page.testSubj.click('runWorkflowHeaderButton');
    await page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal');
    await page.testSubj.click('confirmModalConfirmButton');

    const workflowExecutionPanelLocator = page.testSubj.locator('workflowExecutionPanel');
    const foreachLoopNodeLocator = workflowExecutionPanelLocator
      .locator('.euiTreeView__node')
      .filter({ hasText: 'loop_over_results' });
    await expect(foreachLoopNodeLocator).toBeVisible();

    await foreachLoopNodeLocator.locator('.euiTreeView__expansionArrow').click();

    await pageObjects.workflowEditor.expandStepsTree();

    const processItemsLocator = workflowExecutionPanelLocator
      .locator('.euiTreeView__nodeInner')
      .filter({ hasText: 'process-item' });

    const requiredOutputs = ['Grand Canyon National Park', 'Zion National Park'];

    await expect(processItemsLocator).toHaveCount(requiredOutputs.length);

    const processItemSteps = await processItemsLocator.all();

    for (let i = 0; i < processItemSteps.length; i++) {
      await pageObjects.workflowEditor
        .getStep(`loop_over_results > ${i} > process-item`)
        .then((locator) => locator.click());

      const stepOutput = await pageObjects.workflowEditor.getStepOutputJson<string>();
      expect(stepOutput).toBe(requiredOutputs[i]);
    }
  });
});
