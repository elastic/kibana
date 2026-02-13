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
import { spaceTest as test } from '../fixtures';
import { cleanupWorkflowsAndRules } from '../fixtures/cleanup';
import { EXECUTION_TIMEOUT } from '../fixtures/constants';
import {
  getDummyWorkflowYaml,
  getIncompleteStepTypeYaml,
  getInvalidWorkflowYaml,
} from '../fixtures/workflows';

test.describe(
  'Sanity tests for workflows',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
    });

    test('Create, save, run and view a dummy workflow', async ({ pageObjects, page }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();

      const workflowName = 'Dummy Workflow';

      // Set the editor value
      await pageObjects.workflowEditor.setYamlEditorValue(getDummyWorkflowYaml(workflowName));

      // Now the save button should be enabled and clicking it will save the correct value
      await pageObjects.workflowEditor.saveWorkflow();
      await pageObjects.workflowList.navigate();
      await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });

      const workflowRow = pageObjects.workflowList.getWorkflowRow(workflowName);
      await expect(workflowRow).toBeVisible();
      await workflowRow.getByLabel('Run').click();
      await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });

      const inputEditor = page.testSubj.locator('workflow-manual-json-editor');
      await expect(inputEditor).toBeVisible();
      await pageObjects.workflowEditor.setExecuteModalInputs({ message: 'Hello Kibana' });
      await page.testSubj.click('executeWorkflowButton');

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      const helloWorldStep = await pageObjects.workflowExecution.getStep('hello_world_step');
      await helloWorldStep.click();
      const stepOutput = await pageObjects.workflowExecution.getStepResultJson<string>('output');
      expect(stepOutput).toBe('Hello Kibana');
    });

    test('should show validation errors for invalid workflow YAML and clear them when fixed', async ({
      pageObjects,
    }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const workflowName = 'Invalid Workflow';
      await pageObjects.workflowEditor.setYamlEditorValue(getInvalidWorkflowYaml(workflowName));

      // Wait for validation to complete and show errors
      const validationAccordion = pageObjects.workflowEditor.validationErrorsAccordion;
      await expect(validationAccordion).toBeVisible();
      await expect(validationAccordion).toContainText('error');

      // Click to expand the accordion and verify the specific error message
      await validationAccordion.getByRole('button', { name: 'error' }).click();
      await expect(validationAccordion.getByText('missing property "steps"')).toBeVisible();

      // Fix the workflow by pasting valid YAML
      await pageObjects.workflowEditor.setYamlEditorValue(getDummyWorkflowYaml(workflowName));

      // Validation errors should disappear
      await expect(validationAccordion).toContainText('No validation errors');
    });

    test('should show step type autocompletion suggestions', async ({ pageObjects, page }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const workflowName = 'Autocomplete Test';
      await pageObjects.workflowEditor.setYamlEditorValue(getIncompleteStepTypeYaml(workflowName));

      // Set incomplete YAML with empty step type
      await pageObjects.workflowEditor.setYamlEditorValue(getIncompleteStepTypeYaml(workflowName));

      // Click on the "type:" line to focus the editor at that position
      await page.getByText('type:', { exact: true }).click();

      // Move to end of line and trigger autocomplete
      await page.keyboard.press('End');
      await page.keyboard.press('Space');

      // Verify the suggest widget appears with step type options
      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      await page.keyboard.type('ela');

      // Verify step types are shown in suggestions (alphabetically sorted, starting with 'a')
      await expect(
        suggestWidget.getByRole('option', { name: 'elasticsearch.search' })
      ).toBeVisible();
      await expect(
        suggestWidget.getByRole('option', { name: 'elasticsearch.index' })
      ).toBeVisible();
      await expect(suggestWidget.getByRole('option', { name: 'elasticsearch.bulk' })).toBeVisible();

      await suggestWidget.getByRole('option', { name: 'elasticsearch.search' }).click();
      await page.keyboard.press('Enter');
      await page.keyboard.type('with:');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');

      await expect(suggestWidget).toBeVisible();
      await page.keyboard.type('ind');

      await expect(suggestWidget.getByRole('option', { name: 'index' })).toBeVisible();
    });
  }
);
