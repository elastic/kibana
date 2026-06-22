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
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { spaceTest as test } from '../../fixtures';
import { cleanupWorkflowsAndRules } from '../../fixtures/cleanup';
import { LONG_EXECUTION_TIMEOUT } from '../../fixtures/constants';
import { getLongRunningCancellationWorkflowYaml } from '../../fixtures/workflows';

test.describe('Workflow execution - Cancellation', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should cancel a single running execution from the execution details panel', async ({
    pageObjects,
    page,
  }) => {
    const workflowName = `Scout cancel single ${Date.now()}`;

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getLongRunningCancellationWorkflowYaml(workflowName)
    );
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();

    await pageObjects.workflowExecution.waitForExecutionStatus(ExecutionStatus.RUNNING, 5000);

    await page.testSubj.click('cancelExecutionButton');

    await pageObjects.workflowExecution.waitForExecutionStatus(ExecutionStatus.CANCELLED, 5000);
  });

  test('should cancel all active executions from the execution list via Cancel all active', async ({
    pageObjects,
    page,
    apiServices,
  }) => {
    test.setTimeout(LONG_EXECUTION_TIMEOUT * 3);

    const workflowName = `Scout cancel bulk ${Date.now()}`;
    const yaml = getLongRunningCancellationWorkflowYaml(workflowName);
    const workflow = await apiServices.workflows.create(yaml);

    await Promise.all(Array.from({ length: 5 }, () => apiServices.workflows.run(workflow.id, {})));

    await expect
      .poll(
        async () => {
          const { results } = await apiServices.workflows.getExecutions(workflow.id, {
            size: 20,
            page: 1,
          });
          return results.filter((e) => e.status !== undefined && !isTerminalStatus(e.status))
            .length;
        },
        { timeout: LONG_EXECUTION_TIMEOUT }
      )
      .toBe(5);

    await pageObjects.workflowEditor.gotoWorkflowExecutions(workflow.id);

    await page.testSubj.click('cancelAllActiveExecutionsButton');
    const modal = page.testSubj.locator('cancelAllActiveExecutionsConfirmationModal');
    await modal.waitFor({ state: 'visible' });
    await modal.getByRole('button', { name: 'Cancel all' }).click();

    await expect(
      page.getByText('Cancellation requested for all active executions of this workflow')
    ).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(
        async () => {
          const { results } = await apiServices.workflows.getExecutions(workflow.id, {
            size: 20,
            page: 1,
          });
          return (
            results.length >= 5 &&
            results.every((e) => e.status !== undefined && isTerminalStatus(e.status))
          );
        },
        { timeout: LONG_EXECUTION_TIMEOUT }
      )
      .toBe(true);

    const { results: finalResults } = await apiServices.workflows.getExecutions(workflow.id, {
      size: 20,
      page: 1,
    });
    expect(finalResults).toHaveLength(5);
    expect(finalResults.every((r) => r.status === ExecutionStatus.CANCELLED)).toBe(true);
  });
});
