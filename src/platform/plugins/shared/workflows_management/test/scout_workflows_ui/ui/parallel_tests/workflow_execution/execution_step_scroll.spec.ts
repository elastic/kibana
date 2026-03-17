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

    const expectEditorScrolledTo = async (searchText: string) => {
      const targetLine = await pageObjects.workflowEditor.getLineOfText(searchText);
      await expect
        .poll(
          async () => {
            const range = await pageObjects.workflowEditor.getEditorVisibleLineRange();
            return range.startLine <= targetLine && targetLine <= range.endLine;
          },
          { timeout: 10_000 }
        )
        .toBe(true);
    };

    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(getScrollTestWorkflowYaml(workflowName));
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    await test.step('click last step and verify editor scrolled to it', async () => {
      await pageObjects.workflowExecution.executionPanel
        .getByRole('button', { name: 'step_hotel' })
        .click();

      await expectEditorScrolledTo('name: step_hotel');
    });

    await test.step('click first step and verify editor scrolled back', async () => {
      await pageObjects.workflowExecution.executionPanel
        .getByRole('button', { name: 'step_alpha' })
        .click();

      await expectEditorScrolledTo('name: step_alpha');
    });

    await test.step('click trigger and verify editor scrolled to triggers section', async () => {
      await pageObjects.workflowExecution.executionPanel
        .getByRole('button', { name: 'manual' })
        .click();

      await expectEditorScrolledTo('triggers:');
    });
  });
});
