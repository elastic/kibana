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

const getDebuggerUiWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
triggers:
  - type: manual
steps:
  - name: mocked_step
    type: console
    with:
      message: "real message"
    mock:
      output: "mocked-greeting-from-debugger"
  - name: target_step
    type: console
    with:
      message: "Got: {{ steps.mocked_step.output }}"
`;

test.describe('Workflow execution - Debugger UI', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('runs workflow in debug mode with mocked step output, pauses at breakpoint, and continues to completion', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = 'Test Workflow Debugger UI';

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getDebuggerUiWorkflowYaml(workflowName));

    await test.step('add breakpoint on target_step and start debug run', async () => {
      await pageObjects.workflowEditor.toggleStepBreakpoint('target_step');
      await pageObjects.workflowEditor.runWorkflowWithUnsavedChanges();
      await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
      await page.testSubj.click('debugWorkflowButton');
    });

    await test.step('verify execution pauses at breakpoint and shows mocked tag', async () => {
      await pageObjects.workflowExecution.waitForExecutionStatus(
        'waiting_for_input',
        EXECUTION_TIMEOUT
      );
      await expect(page.testSubj.locator('workflowStepTreeIterationTag-mocked')).toBeVisible();
      await expect(page.testSubj.locator('continueBreakpointButton')).toBeVisible();
    });

    await test.step('continue from breakpoint and verify mocked output was used', async () => {
      await page.testSubj.click('continueBreakpointButton');
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      await (await pageObjects.workflowExecution.getStep('target_step')).click();
      await expect(pageObjects.workflowExecution.getStepResultSection('output')).toContainText(
        'Got: mocked-greeting-from-debugger'
      );
    });
  });
});
