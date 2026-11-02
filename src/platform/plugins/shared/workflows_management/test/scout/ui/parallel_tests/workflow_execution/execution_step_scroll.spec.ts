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
import { EXECUTION_TIMEOUT } from '../../fixtures/constants';
import { getScrollTestWorkflowYaml } from '../../fixtures/workflows';

test.describe('Workflow execution - Step scroll', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('clicking a step in execution tree scrolls YAML editor to that step', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = 'Scroll Test Workflow';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getScrollTestWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    // The execution flyout opens the step detail. It does not scroll the YAML editor.
    const expectStepDetail = async (stepName: string) => {
      await expect(
        pageObjects.workflowExecution.executionPanel.getByRole('heading', { name: stepName })
      ).toBeVisible();
    };

    await test.step('click last step and verify its detail opens', async () => {
      await (await pageObjects.workflowExecution.getStep('step_hotel')).click();
      await expectStepDetail('step_hotel');
    });

    await test.step('click first step and verify its detail opens', async () => {
      await (await pageObjects.workflowExecution.getStep('step_alpha')).click();
      await expectStepDetail('step_alpha');
    });

    await test.step('click inputs and verify the manual payload', async () => {
      await (await pageObjects.workflowExecution.getStep('Manual trigger')).click();
      await expectStepDetail('manual');
      expect(
        await pageObjects.workflowExecution.getStepResultJson<Record<string, string>>('input')
      ).toStrictEqual(
        expect.objectContaining({
          param_a: 'value_a',
          param_b: 'value_b',
          param_c: 'value_c',
        })
      );
    });
  });
});
