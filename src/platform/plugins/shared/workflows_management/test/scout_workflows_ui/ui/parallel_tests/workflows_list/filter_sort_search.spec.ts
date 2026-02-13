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

test.describe('WorkflowsList/FilterSortSearch', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('should filter workflows by enabling state', async ({
    page,
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const enabledWorkflow = {
      name: 'FilterSortSearch Enabled Workflow 1',
      description: 'Enabled workflow for filter test',
      enabled: true,
    };
    const disabledWorkflow = {
      name: 'FilterSortSearch Disabled Workflow 1',
      description: 'Disabled workflow for filter test',
      enabled: false,
    };
    await apiServices.workflows.bulkCreate(
      scoutSpace.id,
      [enabledWorkflow, disabledWorkflow].map(getListTestWorkflowYaml)
    );

    await pageObjects.workflowList.navigate();
    const filterOption = await pageObjects.workflowList.getFilterOption(
      'enabled-filter-popover-button',
      'true'
    );
    await filterOption.click();
    await expect(
      page.locator('tr [data-test-subj^="workflowToggleSwitch-"][aria-checked="false"]')
    ).toHaveCount(0);
    await expect(pageObjects.workflowList.getWorkflowRow(disabledWorkflow.name)).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow(enabledWorkflow.name)).toBeVisible();
  });

  test('should filter workflows by disabling state', async ({
    page,
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
    const enabledWorkflow = {
      name: 'FilterSortSearch Enabled Workflow 2',
      description: 'Enabled workflow for disable filter test',
      enabled: true,
    };
    const disabledWorkflow = {
      name: 'FilterSortSearch Disabled Workflow 2',
      description: 'Disabled workflow for disable filter test',
      enabled: false,
    };
    await apiServices.workflows.bulkCreate(
      scoutSpace.id,
      [enabledWorkflow, disabledWorkflow].map(getListTestWorkflowYaml)
    );

    await pageObjects.workflowList.navigate();
    const filterOption = await pageObjects.workflowList.getFilterOption(
      'enabled-filter-popover-button',
      'false'
    );
    await filterOption.click();
    await expect(
      page.locator('tr [data-test-subj^="workflowToggleSwitch-"][aria-checked="true"]')
    ).toHaveCount(0);
    await expect(pageObjects.workflowList.getWorkflowRow(enabledWorkflow.name)).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow(disabledWorkflow.name)).toBeVisible();
  });

  test('should search by name and description', async ({
    pageObjects,
    apiServices,
    scoutSpace,
  }) => {
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
    await apiServices.workflows.bulkCreate(scoutSpace.id, workflows.map(getListTestWorkflowYaml));

    await pageObjects.workflowList.navigate();

    // Search by name
    const searchField = pageObjects.workflowList.getSearchField();
    await searchField.fill('Banana');
    await searchField.press('Enter');
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeHidden();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeHidden();

    // Search by description
    await searchField.clear();
    await searchField.fill('apple');
    await searchField.press('Enter');
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeHidden();

    // Clear search
    await searchField.clear();
    await searchField.press('Enter');
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[0].name)).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[1].name)).toBeVisible();
    await expect(pageObjects.workflowList.getWorkflowRow(workflows[2].name)).toBeVisible();
  });
});
