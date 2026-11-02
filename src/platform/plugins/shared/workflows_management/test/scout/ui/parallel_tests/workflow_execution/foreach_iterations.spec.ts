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

      // The flyout header shows when the run started and its result. Start/end copy
      // from the previous overview panel is not part of this flyout.
      await expect(page.testSubj.locator('workflowExecutionFlyoutStartedAt')).toBeVisible();
      await expect(page.testSubj.locator('workflowExecutionStatus')).toHaveText('Success');

      await pageObjects.workflowExecution.expandStepsTree();

      // Manual runs show their payload on the trigger row.
      const inputsStep = await pageObjects.workflowExecution.getStep('Manual trigger');
      await inputsStep.click();
      expect(
        await pageObjects.workflowExecution.getStepResultJson<{ message: string }>('input')
      ).toStrictEqual(expect.objectContaining({ message: 'test message' }));

      // Verify execution tree structure
      const firstStepButton = await pageObjects.workflowExecution.getStep('first_step');
      await expect(firstStepButton).toHaveCount(1);

      const loopStepButton = await pageObjects.workflowExecution.getStep('loop');
      await loopStepButton.click();
      await expect(loopStepButton).toHaveCount(1);
      expect(
        await pageObjects.workflowExecution.getStepResultJson<{ items: number[] }>('input')
      ).toStrictEqual(
        expect.objectContaining({
          items: [1, 2],
        })
      );

      const firstIteration = await pageObjects.workflowExecution.getStep('loop > Iteration #0');
      await firstIteration.click();
      expect(
        await pageObjects.workflowExecution.getStepResultJson<{ item: number }>('input')
      ).toStrictEqual({ item: 1 });

      const secondIteration = await pageObjects.workflowExecution.getStep('loop > Iteration #1');
      await secondIteration.click();
      expect(
        await pageObjects.workflowExecution.getStepResultJson<{ item: number }>('input')
      ).toStrictEqual({ item: 2 });

      // Verify foreach produced 2 iterations
      const logIterationButtons = pageObjects.workflowExecution.stepsByName('log_iteration');
      await expect(logIterationButtons).toHaveCount(2);

      const firstLogIteration = await pageObjects.workflowExecution.getStep(
        'loop > Iteration #0 > log_iteration'
      );
      await firstLogIteration.click();
      await expect(pageObjects.workflowExecution.getStepResultSection('output')).toContainText(
        'Iteration is 0'
      );

      const lastLogIteration = await pageObjects.workflowExecution.getStep(
        'loop > Iteration #1 > log_iteration'
      );
      await lastLogIteration.click();
      await expect(pageObjects.workflowExecution.getStepResultSection('output')).toContainText(
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

      // Iterations past the pin threshold fold into one gap. The latest iteration stays visible.
      await expect(
        pageObjects.workflowExecution.executionPanel.getByText('Show 49 more iterations')
      ).toBeVisible();

      const afterForeachStep = await pageObjects.workflowExecution.getStep('after_foreach_step');

      const foreachStep = await pageObjects.workflowExecution.getStep('foreach_loop');
      const foreachArrow = foreachStep.locator('[data-test-subj="workflowStepTreeChevron"]');

      // Collapse then re-expand the foreach loop
      await foreachArrow.click();
      await expect(afterForeachStep).toBeVisible();
      await foreachArrow.click();

      // Compare vertical positions: the post-foreach step must render
      // below the last iteration group, not interleaved among them.
      const lastIterationGroup = await pageObjects.workflowExecution.getStep(
        'foreach_loop > Iteration #49'
      );
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
