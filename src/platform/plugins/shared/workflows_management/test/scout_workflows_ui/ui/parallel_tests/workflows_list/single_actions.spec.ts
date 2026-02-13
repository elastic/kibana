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
import { getListTestWorkflowYaml } from '../../fixtures/workflows';

test.describe('WorkflowsList/SingleActions', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should run enabled workflow', async ({ page, pageObjects, apiServices, scoutSpace }) => {
    const enabledWorkflow = {
      name: 'ThreeDotsTest Enabled Workflow',
      description: 'Enabled workflow for run test',
      enabled: true,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(enabledWorkflow));

    // verify run via direct action button
    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList
      .getWorkflowAction(enabledWorkflow.name, 'runWorkflowAction')
      .click();
    await pageObjects.workflowExecution.waitForExecutionView();
    await expect(page.testSubj.locator('workflowDetailHeader')).toContainText(enabledWorkflow.name);

    // verify run via three dots menu action
    await pageObjects.workflowList.navigate();
    const runThreeDotsAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      enabledWorkflow.name,
      'runWorkflowAction'
    );
    await runThreeDotsAction.click();
    await pageObjects.workflowExecution.waitForExecutionView();
    await expect(page.testSubj.locator('workflowDetailHeader')).toContainText(enabledWorkflow.name);
  });

  test('should not run disabled workflow', async ({ pageObjects, apiServices, scoutSpace }) => {
    const disabledWorkflow = {
      name: 'ThreeDotsTest Disabled Workflow',
      description: 'Disabled workflow for run test',
      enabled: false,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(disabledWorkflow));
    await pageObjects.workflowList.navigate();

    // verify disabled via direct action button
    await expect(
      pageObjects.workflowList.getWorkflowAction(disabledWorkflow.name, 'runWorkflowAction')
    ).toBeDisabled();

    // verify disabled via three dots menu action
    const runThreeDotsAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      disabledWorkflow.name,
      'runWorkflowAction'
    );
    await expect(runThreeDotsAction).toBeDisabled();
  });

  test('should enable disabled workflow via toggle', async ({
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const disabledWorkflow = {
      name: 'Toggle Enable Workflow',
      description: 'This workflow starts disabled and should be enabled via toggle',
      enabled: false,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(disabledWorkflow));
    await pageObjects.workflowList.navigate();

    const toggle = pageObjects.workflowList.getWorkflowStateToggle(disabledWorkflow.name);
    await expect(toggle).not.toBeChecked();

    await toggle.click();
    await expect(toggle).toBeChecked();

    await expect(
      pageObjects.workflowList.getWorkflowAction(disabledWorkflow.name, 'runWorkflowAction')
    ).toBeEnabled();
  });

  test('should disable enabled workflow via toggle', async ({
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const enabledWorkflow = {
      name: 'Toggle Disable Workflow',
      description: 'This workflow starts enabled and should be disabled via toggle',
      enabled: true,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(enabledWorkflow));
    await pageObjects.workflowList.navigate();

    const toggle = pageObjects.workflowList.getWorkflowStateToggle(enabledWorkflow.name);
    await expect(toggle).toBeChecked();

    await toggle.click();
    await expect(toggle).not.toBeChecked();

    await expect(
      pageObjects.workflowList.getWorkflowAction(enabledWorkflow.name, 'runWorkflowAction')
    ).toBeDisabled();
  });

  test('should open workflow for editing via edit action', async ({
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const workflow = {
      name: 'Edit Action Test Workflow',
      description: 'This workflow should be opened for editing',
      enabled: true,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(workflow));
    await pageObjects.workflowList.navigate();

    // verify edit via direct action button
    await pageObjects.workflowList.getWorkflowAction(workflow.name, 'editWorkflowAction').click();
    await pageObjects.workflowEditor.waitForEditorView();

    // verify edit via three dots menu action
    await pageObjects.workflowList.navigate();
    const editThreeDotsAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'editWorkflowAction'
    );
    await editThreeDotsAction.click();
    await pageObjects.workflowEditor.waitForEditorView();
  });

  test('should clone workflow via three dots menu', async ({
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const workflow = {
      name: 'Clone Action Test Workflow',
      description: 'This workflow should be cloned',
      enabled: true,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(workflow));
    await pageObjects.workflowList.navigate();

    const cloneAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'cloneWorkflowAction'
    );
    await cloneAction.click();

    // Verify the cloned workflow appears in the list with " Copy" suffix
    const clonedWorkflowName = `${workflow.name} Copy`;
    await expect(pageObjects.workflowList.getWorkflowRow(clonedWorkflowName)).toBeVisible();
  });

  test('should delete workflow via three dots menu', async ({
    page,
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const workflow = {
      name: 'Delete Action Test Workflow',
      description: 'This workflow should be deleted',
      enabled: true,
    };
    await apiServices.workflows.create(scoutSpace.id, getListTestWorkflowYaml(workflow));
    await pageObjects.workflowList.navigate();

    const deleteAction = await pageObjects.workflowList.getThreeDotsMenuAction(
      workflow.name,
      'deleteWorkflowAction'
    );
    await deleteAction.click();
    await page.testSubj.click('confirmModalConfirmButton');

    // Verify the workflow is removed from the list
    await expect(pageObjects.workflowList.getWorkflowRow(workflow.name)).toBeHidden();
  });
});
