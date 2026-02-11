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
import { EXECUTION_TIMEOUT } from '../../fixtures/constants';
import { getCreateGetUpdateCaseWorkflowYaml } from '../../fixtures/workflows';

/**
 * Returns the correct case owner based on the project type.
 * - Observability: uses 'observability'
 * - Security / ESS: uses 'securitySolution'
 * - ES: uses 'cases'
 */
const getCaseOwner = (projectType: string | undefined) => {
  if (projectType === 'es' || projectType === undefined) {
    return 'cases';
  }
  if (projectType === 'oblt') {
    return 'observability';
  }
  return 'securitySolution';
};

test.describe(
  'InternalActions/Cases',
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

    test('should run create_get_update_case workflow successfully', async ({
      page,
      pageObjects,
      config,
    }) => {
      const caseOwner = getCaseOwner(config.projectType);
      const workflowInput = {
        title: `Test Case ${Math.floor(Math.random() * 10000)}`,
        description: 'This is a test case description',
        severity: 'low',
        comments: [
          {
            type: 'user',
            comment: 'This is the case comment 1',
          },
          {
            type: 'user',
            comment: 'This is the case comment 2',
          },
        ],
      };

      // Navigate to new workflow and set YAML
      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.setYamlEditorValue(
        getCreateGetUpdateCaseWorkflowYaml(caseOwner)
      );

      // Run workflow with unsaved changes
      await page.testSubj.click('runWorkflowHeaderButton');
      await page.testSubj.waitForSelector('runWorkflowWithUnsavedChangesConfirmationModal');
      await page.testSubj.click('confirmModalConfirmButton');

      // Set workflow inputs in the execute modal
      await page.testSubj.waitForSelector('workflowExecuteModal', { state: 'visible' });
      await pageObjects.workflowEditor.setExecuteModalInputs(workflowInput);

      // Execute the workflow
      await page.testSubj.click('executeWorkflowButton');

      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      // Expand all steps in the tree
      await pageObjects.workflowExecution.expandStepsTree();

      // Verify create_case step output
      const createCaseStep = await pageObjects.workflowExecution.getStep('create_case');
      await createCaseStep.click();

      const createCaseOutput = await pageObjects.workflowExecution.getStepResultJson<{
        id: string;
        version: string;
        title: string;
        description: string;
        severity: string;
      }>('output');
      expect(createCaseOutput.title).toBe(workflowInput.title);
      expect(createCaseOutput.description).toBe(workflowInput.description);
      expect(createCaseOutput.severity).toBe(workflowInput.severity);
      expect(createCaseOutput.id).toBeDefined();
      expect(createCaseOutput.version).toBeDefined();

      const caseId = createCaseOutput.id;
      const initialVersion = createCaseOutput.version;

      // Verify add_case_comment step outputs
      for (let i = 0; i < workflowInput.comments.length; i++) {
        const comment = workflowInput.comments[i];
        const createCaseCommentStep = await pageObjects.workflowExecution.getStep(
          `loop_through_comments > ${i} > create_case_comment`
        );
        await createCaseCommentStep.click();

        const createCaseCommentOutput = await pageObjects.workflowExecution.getStepResultJson<{
          comments: {
            owner: string;
            type: string;
            comment: string;
          }[];
        }>('output');
        expect(createCaseCommentOutput.comments).toHaveLength(i + 1);
        expect(createCaseCommentOutput.comments[i].owner).toBe(caseOwner);
        expect(createCaseCommentOutput.comments[i].type).toBe(comment.type);
        expect(createCaseCommentOutput.comments[i].comment).toBe(comment.comment);
      }

      // Verify update_case step output
      const updateCaseStep = await pageObjects.workflowExecution.getStep('update_case');
      await updateCaseStep.click();

      const updateCaseOutput = await pageObjects.workflowExecution.getStepResultJson<
        Array<{
          id: string;
          version: string;
          title: string;
        }>
      >('output');
      expect(updateCaseOutput).toBeDefined();
      expect(updateCaseOutput.length).toBeGreaterThan(0);
      expect(updateCaseOutput[0].id).toBe(caseId);
      expect(updateCaseOutput[0].title).toBe(`Updated: ${workflowInput.title}`);
      // Version should be incremented after update
      expect(updateCaseOutput[0].version).not.toBe(initialVersion);

      // Verify get_case step output
      const getCaseStep = await pageObjects.workflowExecution.getStep('get_case');
      await getCaseStep.click();

      const getCaseOutput = await pageObjects.workflowExecution.getStepResultJson<{
        id: string;
        version: string;
        title: string;
        description: string;
      }>('output');
      expect(getCaseOutput.id).toBe(caseId);
      expect(getCaseOutput.title).toBe(`Updated: ${workflowInput.title}`);
      expect(getCaseOutput.description).toBe(`Updated: ${workflowInput.description}`);
      expect(getCaseOutput.version).toBeDefined();
    });
  }
);
