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

test.describe('WorkflowsList/FilterSortSearch', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices, kbnClient }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices, kbnClient });
  });

  test('should filter workflows by enabling state', async ({ page, pageObjects }) => {
    const enabledWorkflow = {
      name: 'FilterSortSearch Enabled Workflow 1',
      description: 'This is bulk workflow number 1',
      enabled: true,
    };
    const disabledWorkflow = {
      name: 'FilterSortSearch Disabled Workflow 1',
      description: 'This is bulk workflow number 1',
      enabled: false,
    };
    await pageObjects.workflowList.createDummyWorkflows([enabledWorkflow, disabledWorkflow]);

    // verify run via direct action button
    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList
      .getFilterOption('enabled-filter-popover-button', 'true')
      .then((locator) => locator.click());
    await expect(
      page.locator('tr [data-test-subj^="workflowToggleSwitch-"][aria-checked="false"]')
    ).toHaveCount(0);
    await expect(await pageObjects.workflowList.getWorkflowRow(disabledWorkflow.name)).toBeHidden();
    await expect(await pageObjects.workflowList.getWorkflowRow(enabledWorkflow.name)).toBeVisible();
  });

  test('should filter workflows by disabling state', async ({ page, pageObjects }) => {
    const enabledWorkflow = {
      name: 'FilterSortSearch Enabled Workflow 2',
      description: 'This is bulk workflow number 2',
      enabled: true,
    };
    const disabledWorkflow = {
      name: 'FilterSortSearch Disabled Workflow 2',
      description: 'This is bulk workflow number 2',
      enabled: false,
    };
    await pageObjects.workflowList.createDummyWorkflows([enabledWorkflow, disabledWorkflow]);

    await pageObjects.workflowList.navigate();
    await pageObjects.workflowList
      .getFilterOption('enabled-filter-popover-button', 'false')
      .then((locator) => locator.click());
    await expect(
      page.locator('tr [data-test-subj^="workflowToggleSwitch-"][aria-checked="true"]')
    ).toHaveCount(0);
    await expect(await pageObjects.workflowList.getWorkflowRow(enabledWorkflow.name)).toBeHidden();
    await expect(
      await pageObjects.workflowList.getWorkflowRow(disabledWorkflow.name)
    ).toBeVisible();
  });

  test('should search by name and description', async ({ pageObjects }) => {
    const workflows = [
      {
        name: 'Search Test Apple Workflow',
        description: 'Workflow for testing apple search',
        enabled: true,
      },
      {
        name: 'Search Test Banana Workflow',
        description: 'Workflow for testing banana search',
        enabled: true,
      },
      {
        name: 'Search Test Orange Workflow',
        description: 'Contains apple in description',
        enabled: false,
      },
    ];
    await pageObjects.workflowList.createDummyWorkflows(workflows);

    await pageObjects.workflowList.navigate();

    // Search by name
    const searchField = await pageObjects.workflowList.getSearchField();
    await searchField.fill('Banana');
    await searchField.press('Enter');
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeVisible();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeHidden();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeHidden();

    // Search by description
    await searchField.clear();
    await searchField.fill('apple');
    await searchField.press('Enter');
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeVisible();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeVisible();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeHidden();

    // Clear search
    await searchField.clear();
    await searchField.press('Enter');
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeVisible();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeVisible();
    await expect(await pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeVisible();
  });
});
