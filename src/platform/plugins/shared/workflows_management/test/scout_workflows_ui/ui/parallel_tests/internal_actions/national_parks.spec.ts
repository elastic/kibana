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
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { nationalParksWorkflow } from '../../fixtures/workflows';

test.describe('InternalActions/Elasticsearch', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
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

    await pageObjects.workflowExecution.expandStepsTree();

    // verify output of create_parks_index
    await pageObjects.workflowExecution
      .getStep('create_parks_index')
      .then((locator) => locator.click());
    expect(
      await pageObjects.workflowExecution.getStepResultJson<Record<string, unknown>>('output')
    ).toStrictEqual({
      acknowledged: true,
      shards_acknowledged: true,
      index: 'national-parks',
    });

    // verify output of bulk_index_park_data
    await pageObjects.workflowExecution
      .getStep('bulk_index_park_data')
      .then((locator) => locator.click());
    const bulkIndexOutput = await pageObjects.workflowExecution.getStepResultJson<
      Record<string, unknown>
    >('output');
    expect(bulkIndexOutput.errors).toBe(false);
    expect(bulkIndexOutput.items).toHaveLength(5);

    // verify output of search_park_data
    await pageObjects.workflowExecution
      .getStep('search_park_data')
      .then((locator) => locator.click());
    const searchParkOutput = await pageObjects.workflowExecution.getStepResultJson<{
      hits: {
        total: { value: number };
        hits: unknown[];
      };
    }>('output');
    expect(searchParkOutput.hits).toBeDefined();
    expect(searchParkOutput.hits.total.value).toBe(2);
    expect(searchParkOutput.hits.hits).toHaveLength(2);

    // verify outputs of process-item
    const requiredOutputs = ['Grand Canyon National Park', 'Zion National Park'];

    for (let i = 0; i < requiredOutputs.length; i++) {
      await pageObjects.workflowExecution
        .getStep(`loop_over_results > ${i} > process-item`)
        .then((locator) => locator.click());

      const stepOutput = await pageObjects.workflowExecution.getStepResultJson<string>('output');
      expect(stepOutput).toBe(requiredOutputs[i]);
    }
  });
});
