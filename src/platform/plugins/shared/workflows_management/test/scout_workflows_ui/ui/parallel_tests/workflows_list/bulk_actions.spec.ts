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

test.describe('WorkflowsList/BulkActions', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices, kbnClient }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices, kbnClient });
  });

  test('should enable disabled workflows', async ({ page, pageObjects }) => {
    const workflows = [
      {
        name: 'BulkTest Enabled Workflow 1',
        description: 'This is bulk workflow number 1',
        enabled: false,
      },
      {
        name: 'BulkTest Enabled Workflow 2',
        description: 'This is bulk workflow number 2',
        enabled: false,
      },
    ];
    await pageObjects.workflowList.createDummyWorkflows(workflows);
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'enable'
    );
    const checkEnabled = async () => {
      for (const workflow of workflows) {
        const toggle = await pageObjects.workflowList.getWorkflowStateToggle(workflow.name);
        await expect(toggle).toBeChecked();
      }
    };
    await checkEnabled();
    await page.reload();
    await checkEnabled();
  });

  test('should disable enabled workflows', async ({ page, pageObjects }) => {
    const workflows = [
      {
        name: 'BulkTest Disabled Workflow 1',
        description: 'This is bulk workflow number 1',
        enabled: true,
      },
      {
        name: 'BulkTest Disabled Workflow 2',
        description: 'This is bulk workflow number 2',
        enabled: true,
      },
    ];
    await pageObjects.workflowList.createDummyWorkflows(workflows);
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'disable'
    );
    const checkDisabled = async () => {
      for (const workflow of workflows) {
        const toggle = await pageObjects.workflowList.getWorkflowStateToggle(workflow.name);
        await expect(toggle).not.toBeChecked();
      }
    };
    await checkDisabled();
    await page.reload();
    await checkDisabled();
  });

  test('should delete workflows', async ({ page, pageObjects }) => {
    const workflows = [
      {
        name: 'BulkTest Delete Workflow 1',
        description: 'This is bulk workflow number 1 to be deleted',
        enabled: true,
      },
      {
        name: 'BulkTest Delete Workflow 2',
        description: 'This is bulk workflow number 2 to be deleted',
        enabled: true,
      },
    ];
    await pageObjects.workflowList.createDummyWorkflows(workflows);
    await pageObjects.workflowList.performBulkAction(
      workflows.map((w) => w.name),
      'delete'
    );
    await page.testSubj.click('confirmModalConfirmButton');
    const checkDeleted = async () => {
      for (const workflow of workflows) {
        const workflowRow = page.locator('tr').filter({ hasText: workflow.name });
        await expect(workflowRow).toHaveCount(0);
      }
    };
    await checkDeleted();
    await page.reload();
    await checkDeleted();
  });

  test('should clear selection', async ({ page, pageObjects }) => {
    const workflows = [
      {
        name: 'BulkTest Clear Selection Workflow 1',
        description: 'This is bulk workflow number 1',
        enabled: true,
      },
      {
        name: 'BulkTest Clear Selection Workflow 2',
        description: 'This is bulk workflow number 2',
        enabled: true,
      },
    ];
    await pageObjects.workflowList.createDummyWorkflows(workflows);
    await pageObjects.workflowList.selectWorkflows(workflows.map((w) => w.name));
    await page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'visible',
    });
    await page.testSubj.click('workflows-clear-selection-button');
    await page.testSubj.waitForSelector('workflows-table-bulk-actions-button', {
      state: 'hidden',
    });

    for (const workflow of workflows) {
      await expect(
        await pageObjects.workflowList.getSelectCheckboxForWorkflow(workflow.name)
      ).not.toBeChecked();
    }
  });
});
