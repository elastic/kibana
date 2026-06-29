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
  getRootLevelAutocompleteYaml,
  getWorkflowWithCommentedVariablesYaml,
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

      // Wait for validation to complete and show errors.
      // Monaco YAML schema validation runs in a web worker — wait for the accordion button
      // to become enabled (disabled when no errors). Use a generous timeout since the web
      // worker needs time to parse the schema and emit markers.
      const validationAccordion = pageObjects.workflowEditor.validationErrorsAccordion;
      await expect(validationAccordion).toBeVisible();
      const errorButton = validationAccordion.getByRole('button', { name: 'error' });
      await expect(errorButton).toBeEnabled({ timeout: 20000 });
      await errorButton.click();
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

      // Move to end of line; then type a space via Monaco API (EditContext: keyboard text
      // input no longer reaches Monaco via page.keyboard.press).
      await page.keyboard.press('End');
      await pageObjects.workflowEditor.typeInYamlEditor(' ');

      // Verify the suggest widget appears with step type options
      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestWidget).toBeVisible();

      await pageObjects.workflowEditor.typeInYamlEditor('ela');

      // Verify step types are shown in suggestions (alphabetically sorted, starting with 'a')
      await expect(
        pageObjects.workflowEditor.getYamlEditorSuggestionItem('elasticsearch.search')
      ).toBeVisible();
      await expect(
        pageObjects.workflowEditor.getYamlEditorSuggestionItem('elasticsearch.index')
      ).toBeVisible();
      await expect(
        pageObjects.workflowEditor.getYamlEditorSuggestionItem('elasticsearch.bulk')
      ).toBeVisible();

      await pageObjects.workflowEditor.getYamlEditorSuggestionItem('elasticsearch.search').click();
      await page.keyboard.press('Enter');
      await pageObjects.workflowEditor.typeInYamlEditor('with:');
      await page.keyboard.press('Enter');
      // Type space via Monaco API — page.keyboard.press('Space') doesn't reach Monaco with EditContext
      await pageObjects.workflowEditor.typeInYamlEditor(' ');

      await expect(suggestWidget).toBeVisible();
      await pageObjects.workflowEditor.typeInYamlEditor('ind');

      await expect(pageObjects.workflowEditor.getYamlEditorSuggestionItem('index')).toBeVisible();
    });

    test('should show root-level property suggestions on empty lines', async ({ pageObjects }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const workflowName = 'Root Autocomplete Test';

      const suggestWidget = pageObjects.workflowEditor.getYamlEditorSuggestWidget();

      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        getRootLevelAutocompleteYaml(workflowName),
        'message: "hello"\n'
      );

      await expect(suggestWidget).toBeVisible();

      await expect(pageObjects.workflowEditor.getYamlEditorSuggestionItem('consts')).toBeVisible();
      await expect(pageObjects.workflowEditor.getYamlEditorSuggestionItem('inputs')).toBeVisible();
      await expect(pageObjects.workflowEditor.getYamlEditorSuggestionItem('outputs')).toBeVisible();
    });

    test('should not show validation errors for YAML comment lines with liquid variables', async ({
      pageObjects,
    }) => {
      await pageObjects.workflowEditor.gotoNewWorkflow();
      const workflowName = 'Commented Variables Workflow';
      await pageObjects.workflowEditor.setYamlEditorValue(
        getWorkflowWithCommentedVariablesYaml(workflowName)
      );

      const validationAccordion = pageObjects.workflowEditor.validationErrorsAccordion;
      await expect(validationAccordion).toContainText('No validation errors');
    });
  }
);
