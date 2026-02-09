/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect, tags } from '@kbn/scout';
import { spaceTest as test } from '../../fixtures';
import { createGetUpdateCase } from '../../fixtures/workflows';

test.describe('InternalActions/Cases', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should run create_get_update_case workflow successfully', async ({ page, pageObjects }) => {
    const testTitle = `Test Case ${Math.floor(Math.random() * 10000)}`;
    const testDescription = 'This is a test case description';
    const testSeverity = 'low';

    // Navigate to new workflow and set YAML
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(createGetUpdateCase);

    // Run workflow with unsaved changes
    await page.testSubj.click('runWorkflowHeaderButton');
    await page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal');
    await page.testSubj.click('confirmModalConfirmButton');

    // Set workflow inputs in the execute modal
    await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
    await pageObjects.workflowEditor.setExecuteModalInputs({
      title: testTitle,
      description: testDescription,
      severity: testSeverity,
    });

    // Execute the workflow
    await page.testSubj.click('executeWorkflowButton');

    await pageObjects.workflowEditor.waitForExecutionStatus('completed', 15000);

    // Expand all steps in the tree
    await pageObjects.workflowEditor.expandStepsTree();

    // Verify create_case step output
    const createCaseStep = await pageObjects.workflowEditor.getStep('create_case');
    await createCaseStep.click();

    const createCaseOutput = await pageObjects.workflowEditor.getStepOutputJson<{
      id: string;
      version: string;
      title: string;
      description: string;
      severity: string;
    }>();
    expect(createCaseOutput.title).toBe(testTitle);
    expect(createCaseOutput.description).toBe(testDescription);
    expect(createCaseOutput.severity).toBe(testSeverity);
    expect(createCaseOutput.id).toBeDefined();
    expect(createCaseOutput.version).toBeDefined();

    const caseId = createCaseOutput.id;
    const initialVersion = createCaseOutput.version;

    // Verify get_case step output
    const getCaseStep = await pageObjects.workflowEditor.getStep('get_case');
    await getCaseStep.click();

    const getCaseOutput = await pageObjects.workflowEditor.getStepOutputJson<{
      id: string;
      version: string;
      title: string;
      description: string;
    }>();
    expect(getCaseOutput.id).toBe(caseId);
    expect(getCaseOutput.title).toBe(testTitle);
    expect(getCaseOutput.description).toBe(testDescription);
    expect(getCaseOutput.version).toBe(initialVersion);

    // Verify update_case step output
    const updateCaseStep = await pageObjects.workflowEditor.getStep('update_case');
    await updateCaseStep.click();

    const updateCaseOutput = await pageObjects.workflowEditor.getStepOutputJson<
      Array<{
        id: string;
        version: string;
        title: string;
      }>
    >();
    expect(updateCaseOutput).toBeDefined();
    expect(updateCaseOutput.length).toBeGreaterThan(0);
    expect(updateCaseOutput[0].id).toBe(caseId);
    expect(updateCaseOutput[0].title).toBe('Updated');
    // Version should be incremented after update
    expect(updateCaseOutput[0].version).not.toBe(initialVersion);
  });
});
