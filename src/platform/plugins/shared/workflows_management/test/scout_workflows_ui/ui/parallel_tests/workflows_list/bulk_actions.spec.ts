/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, KibanaCodeEditorWrapper, ScoutPage, tags, spaceTest as test } from '@kbn/scout';

const getTestRunWorkflowYaml = (name: string, description: string, enabled: boolean) => `
name: ${name}
enabled: ${enabled}
description: ${description}
triggers:
  - type: manual

steps:
  - name: hello_world_step
    type: console
    with:
      message: "Test run: {{ execution.isTestRun }}"
`;

test.describe('WorkflowsList/BulkActions', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  async function createWorkflows(
    page: ScoutPage,
    workflows: { name: string; description: string; enabled: boolean }[]
  ) {
    for (const workflow of workflows) {
      await page.gotoApp('workflows');
      await page.testSubj.click('createWorkflowButton');

      const yamlEditor = page.testSubj.locator('workflowYamlEditor');
      await expect(yamlEditor).toBeVisible();

      const yamlEditorWrapper = new KibanaCodeEditorWrapper(page);
      await yamlEditorWrapper.setCodeEditorValue(
        getTestRunWorkflowYaml(workflow.name, workflow.description, workflow.enabled)
      );
      await page.testSubj.click('saveWorkflowHeaderButton');
      await page.testSubj.waitForSelector('workflowSavedChangesBadge');
    }
  }

  async function performBulkAction(
    page: ScoutPage,
    workflowNamesToCheck: string[],
    action: 'enable' | 'disable' | 'delete'
  ) {
    for (const workflowName of workflowNamesToCheck) {
      await page
        .locator('tr')
        .filter({ hasText: workflowName })
        .locator('td:first-child input[type="checkbox"]')
        .check();
    }

    await page.testSubj.click('workflows-table-bulk-actions-button');
    await page.testSubj.click(`workflows-bulk-action-${action}`);
  }

  test('should enable disabled workflows', async ({ page }) => {
    await page.gotoApp('workflows');
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
    await createWorkflows(page, workflows);
    await page.gotoApp('workflows');
    await performBulkAction(
      page,
      workflows.map((w) => w.name),
      'enable'
    );
    const checkEnabled = async () => {
      for (const workflow of workflows) {
        const toggle = page
          .locator('tr')
          .filter({ hasText: workflow.name })
          .locator('[data-test-subj^="workflowToggleSwitch-"]');
        await expect(toggle).toBeChecked();
      }
    };
    await checkEnabled();
    await page.reload();
    await checkEnabled();
  });

  test('should disable enabled workflows', async ({ page }) => {
    await page.gotoApp('workflows');
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
    await createWorkflows(page, workflows);
    await page.gotoApp('workflows');
    await performBulkAction(
      page,
      workflows.map((w) => w.name),
      'disable'
    );
    const checkDisabled = async () => {
      for (const workflow of workflows) {
        const toggle = page
          .locator('tr')
          .filter({ hasText: workflow.name })
          .locator('[data-test-subj^="workflowToggleSwitch-"]');
        await expect(toggle).not.toBeChecked();
      }
    };
    await checkDisabled();
    await page.reload();
    await checkDisabled();
  });

  test('should delete workflows', async ({ page }) => {
    await page.gotoApp('workflows');
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
    await createWorkflows(page, workflows);
    await page.gotoApp('workflows');
    await performBulkAction(
      page,
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
});
