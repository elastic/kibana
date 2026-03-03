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
import {
  getIterationLoopWorkflowYaml,
  getManyIterationsWorkflowYaml,
} from '../../fixtures/workflows';

test.describe(
  'Workflow execution - Foreach iterations',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('should display execution tree with foreach loops showing multiple iterations', async ({
      pageObjects,
      page,
    }) => {
      const workflowName = 'Test Workflow Foreach Iterations';

      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.setYamlEditorValue(
        getIterationLoopWorkflowYaml(workflowName)
      );
      await pageObjects.workflowEditor.saveWorkflow();

      // Run with custom input
      await pageObjects.workflowEditor.executeWorkflowWithInputs({ message: 'test message' });

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Verify overview section
      const overviewSection = page.testSubj.locator('workflowExecutionOverview');
      await expect(overviewSection).toBeVisible();
      await expect(overviewSection.getByText('Execution started')).toBeVisible();
      await expect(overviewSection.getByText('Execution ended')).toBeVisible();

      await pageObjects.workflowExecution.expandStepsTree();

      // Verify trigger section shows the manual input
      const manualStep = await pageObjects.workflowExecution.getStep('manual');
      await manualStep.click();
      const triggerSection = page.testSubj.locator('workflowExecutionTrigger');
      await expect(triggerSection).toBeVisible();
      await expect(triggerSection.getByText('test message')).toBeVisible();

      // Verify execution tree structure
      const firstStepButton = await pageObjects.workflowExecution.getStep('first_step');
      await expect(firstStepButton).toHaveCount(1);

      const loopStepButton = await pageObjects.workflowExecution.getStep('loop');
      await loopStepButton.click();
      await expect(loopStepButton).toHaveCount(1);

      // Verify foreach produced 2 iterations
      const logIterationButtons = pageObjects.workflowExecution.executionPanel.getByRole('button', {
        name: 'log_iteration',
      });
      await expect(logIterationButtons).toHaveCount(2);

      // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
      await logIterationButtons.first().click();
      let stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
      await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText(
        'Iteration is 0'
      );

      // eslint-disable-next-line playwright/no-nth-methods -- it's useful here, as it's a list, not a hacky workaround
      await logIterationButtons.last().click();
      stepDetails = page.testSubj.locator('workflowStepExecutionDetails');
      await expect(stepDetails.getByTestId('workflowJsonDataViewer')).toContainText(
        'Iteration is 1'
      );
    });

    test('should display post-foreach steps below all iterations after collapsing and re-expanding', async ({
      pageObjects,
    }) => {
      const workflowName = 'Scroll Test Workflow';

      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.setYamlEditorValue(
        getManyIterationsWorkflowYaml(workflowName)
      );
      await pageObjects.workflowEditor.saveWorkflow();

      await pageObjects.workflowEditor.clickRunButton();

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      await pageObjects.workflowExecution.expandStepsTree();

      const iterationSteps = pageObjects.workflowExecution.executionPanel.getByRole('button', {
        name: /^(?!foreach_).*hello_world_step/,
      });
      await expect(iterationSteps).toHaveCount(50);

      const afterForeachStep = await pageObjects.workflowExecution.getStep('after_foreach_step');

      const foreachStep = await pageObjects.workflowExecution.getStep('foreach_loop');
      const foreachArrow = foreachStep.locator('.euiTreeView__expansionArrow');

      // Collapse then re-expand the foreach loop
      await foreachArrow.click();
      await expect(afterForeachStep).toBeVisible();
      await foreachArrow.click();

      // Compare vertical positions: the post-foreach step must render
      // below the last iteration group, not interleaved among them.
      const lastIterationGroup = await pageObjects.workflowExecution.getStep('foreach_loop > 49');
      await lastIterationGroup.scrollIntoViewIfNeeded();
      const lastIterationBox = await lastIterationGroup.boundingBox();

      await afterForeachStep.scrollIntoViewIfNeeded();
      const afterForeachBox = await afterForeachStep.boundingBox();

      expect(lastIterationBox).toBeTruthy();
      expect(afterForeachBox).toBeTruthy();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by the assertions above
      expect(afterForeachBox!.y).toBeGreaterThan(lastIterationBox!.y);
    });
  }
);
