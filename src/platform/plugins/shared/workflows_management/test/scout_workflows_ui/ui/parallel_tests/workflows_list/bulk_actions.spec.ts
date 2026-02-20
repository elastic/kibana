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

test.describe('WorkflowsList/BulkActions', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should enable disabled workflows', async ({
    page,
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const workflows = [
      { name: 'BulkTest Enabled Workflow 1', description: 'Bulk workflow 1', enabled: false },
      { name: 'BulkTest Enabled Workflow 2', description: 'Bulk workflow 2', enabled: false },
    ];
    await apiServices.workflows.bulkCreate(scoutSpace.id, workflows.map(getListTestWorkflowYaml));

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'enable'
    );
    const checkEnabled = () =>
      Promise.all(
        workflows.map((workflow) =>
          expect(pageObjects.workflowList.getWorkflowStateToggle(workflow.name)).toBeChecked()
        )
      );
    await checkEnabled();
    await page.reload();
    await checkEnabled();
  });

  test('should disable enabled workflows', async ({
    page,
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const workflows = [
      { name: 'BulkTest Disabled Workflow 1', description: 'Bulk workflow 1', enabled: true },
      { name: 'BulkTest Disabled Workflow 2', description: 'Bulk workflow 2', enabled: true },
    ];
    await apiServices.workflows.bulkCreate(scoutSpace.id, workflows.map(getListTestWorkflowYaml));

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'disable'
    );
    const checkDisabled = () =>
      Promise.all(
        workflows.map((workflow) =>
          expect(pageObjects.workflowList.getWorkflowStateToggle(workflow.name)).not.toBeChecked()
        )
      );
    await checkDisabled();
    await page.reload();
    await checkDisabled();
  });

  test('should delete workflows', async ({ page, pageObjects, apiServices, scoutSpace }) => {
    const workflows = [
      { name: 'BulkTest Delete Workflow 1', description: 'To be deleted', enabled: true },
      { name: 'BulkTest Delete Workflow 2', description: 'To be deleted', enabled: true },
    ];
    await apiServices.workflows.bulkCreate(scoutSpace.id, workflows.map(getListTestWorkflowYaml));

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'delete'
    );
    await page.testSubj.click('confirmModalConfirmButton');
    const checkDeleted = () =>
      Promise.all(
        workflows.map((workflow) =>
          expect(pageObjects.workflowList.getWorkflowRow(workflow.name)).toHaveCount(0)
        )
      );
    await checkDeleted();
    await page.reload();
    await checkDeleted();
  });

  test('should clear selection', async ({ page, pageObjects, apiServices, scoutSpace }) => {
    const workflows = [
      {
        name: 'BulkTest Clear Selection Workflow 1',
        description: 'Bulk workflow 1',
        enabled: true,
      },
      {
        name: 'BulkTest Clear Selection Workflow 2',
        description: 'Bulk workflow 2',
        enabled: true,
      },
    ];
    await apiServices.workflows.bulkCreate(scoutSpace.id, workflows.map(getListTestWorkflowYaml));

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList.selectWorkflows(workflows.map((w) => w.name));
    await page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'visible',
    });
    await page.testSubj.click('workflows-clear-selection-button');
    await page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'hidden',
    });

    await Promise.all(
      workflows.map((workflow) =>
        expect(
          pageObjects.workflowList.getSelectCheckboxForWorkflow(workflow.name)
        ).not.toBeChecked()
      )
    );
  });
});
