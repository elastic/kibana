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

test.describe('WorkflowsList/SingleActions', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices, kbnClient }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices, kbnClient });
  });

  test('should run enabled workflow', async ({ page, pageObjects }) => {
    const enabledWorkflow = {
      name: 'ThreeDotsTest Enabled Workflow 1',
      description: 'This is bulk workflow number 1',
      enabled: true,
    };
    await pageObjects.workflowList.createDummyWorkflows([enabledWorkflow]);

    // verify run via direct action button
    await pageObjects.workflowList.navigate();
    (
      await pageObjects.workflowList.getWorkflowAction(enabledWorkflow.name, 'runWorkflowAction')
    ).click();
    await page.waitForURL('**/workflows/*?executionId=*');
    await expect(
      page.locator('.euiPageHeaderSection').filter({ hasText: enabledWorkflow.name })
    ).toBeVisible();

    // verify run via three dots menu action
    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList
      .getThreeDotsMenuAction(enabledWorkflow.name, 'runWorkflowAction')
      .then((locator) => locator.click());
    await page.waitForURL('**/workflows/*?executionId=*');
    await expect(
      page.locator('.euiPageHeaderSection').filter({ hasText: enabledWorkflow.name })
    ).toBeVisible();
  });

  test('should not run disabled workflow', async ({ pageObjects }) => {
    const disabledWorkflow = {
      name: 'ThreeDotsTest Disabled Workflow 1',
      description: 'This is bulk workflow number 1',
      enabled: false,
    };
    await pageObjects.workflowList.createDummyWorkflows([disabledWorkflow]);
    await pageObjects.workflowList.navigate();

    // verify disabled via direct action button
    const runAction = await pageObjects.workflowList.getWorkflowAction(
      disabledWorkflow.name,
      'runWorkflowAction'
    );
    await expect(runAction).toBeDisabled();

    // verify disabled via three dots menu action
    const runThreeDotsAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      disabledWorkflow.name,
      'runWorkflowAction'
    );
    await expect(runThreeDotsAction).toBeDisabled();
  });

  test('should enable disabled workflow via toggle', async ({ pageObjects }) => {
    const disabledWorkflow = {
      name: 'Toggle Enable Workflow',
      description: 'This workflow starts disabled and should be enabled via toggle',
      enabled: false,
    };
    await pageObjects.workflowList.createDummyWorkflows([disabledWorkflow]);
    await pageObjects.workflowList.navigate();

    const toggle = await pageObjects.workflowList.getWorkflowStateToggle(disabledWorkflow.name);
    await expect(toggle).not.toBeChecked();

    await toggle.click();
    await expect(toggle).toBeChecked();

    const runAction = await pageObjects.workflowList.getWorkflowAction(
      disabledWorkflow.name,
      'runWorkflowAction'
    );
    await expect(runAction).toBeEnabled();
  });

  test('should disable enabled workflow via toggle', async ({ pageObjects }) => {
    const enabledWorkflow = {
      name: 'Toggle Disable Workflow',
      description: 'This workflow starts enabled and should be disabled via toggle',
      enabled: true,
    };
    await pageObjects.workflowList.createDummyWorkflows([enabledWorkflow]);
    await pageObjects.workflowList.navigate();

    const toggle = await pageObjects.workflowList.getWorkflowStateToggle(enabledWorkflow.name);
    await expect(toggle).toBeChecked();

    await toggle.click();
    await expect(toggle).not.toBeChecked();

    const runAction = await pageObjects.workflowList.getWorkflowAction(
      enabledWorkflow.name,
      'runWorkflowAction'
    );
    await expect(runAction).toBeDisabled();
  });

  test('should open workflow for editing via edit action', async ({ page, pageObjects }) => {
    const workflow = {
      name: 'Edit Action Test Workflow',
      description: 'This workflow should be opened for editing',
      enabled: true,
    };
    await pageObjects.workflowList.createDummyWorkflows([workflow]);
    await pageObjects.workflowList.navigate();

    // verify edit via direct action button
    const editAction = await pageObjects.workflowList.getWorkflowAction(
      workflow.name,
      'editWorkflowAction'
    );
    await editAction.click();

    await page.waitForURL('**/workflows/*');
    await expect(page.testSubj.locator('workflowYamlEditor')).toBeVisible();

    // verify edit via three dots menu action
    await pageObjects.workflowList.navigate();
    const editThreeDotsAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'editWorkflowAction'
    );
    await editThreeDotsAction.click();

    await page.waitForURL('**/workflows/*');
    await expect(page.testSubj.locator('workflowYamlEditor')).toBeVisible();
  });

  test('should clone workflow via three dots menu', async ({ pageObjects }) => {
    const workflow = {
      name: 'Clone Action Test Workflow',
      description: 'This workflow should be cloned',
      enabled: true,
    };
    await pageObjects.workflowList.createDummyWorkflows([workflow]);
    await pageObjects.workflowList.navigate();

    const cloneAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'cloneWorkflowAction'
    );
    await cloneAction.click();

    // Verify the cloned workflow appears in the list with " Copy" suffix
    const clonedWorkflowName = `${workflow.name} Copy`;
    await expect(await pageObjects.workflowList.getWorkflowRow(clonedWorkflowName)).toBeVisible();
  });

  test('should delete workflow via three dots menu', async ({ page, pageObjects }) => {
    const workflow = {
      name: 'Delete Action Test Workflow',
      description: 'This workflow should be deleted',
      enabled: true,
    };
    await pageObjects.workflowList.createDummyWorkflows([workflow]);
    await pageObjects.workflowList.navigate();

    // Set up dialog handler to accept the confirmation dialog
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    const deleteAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'deleteWorkflowAction'
    );
    await deleteAction.click();

    // Verify the workflow is removed from the list
    await expect(await pageObjects.workflowList.getWorkflowRow(workflow.name)).toBeHidden();
  });
});
