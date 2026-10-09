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
import {
  getForeachFanOutParallelWorkflowYaml,
  getStaticBranchesParallelWorkflowYaml,
} from '../../fixtures/workflows';

test.describe('Workflow execution - Parallel step', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ scoutSpace, apiServices }) => {
    await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
  });

  test('runs static branches concurrently and joins downstream', async ({ pageObjects }) => {
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getStaticBranchesParallelWorkflowYaml('Parallel static branches')
    );
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    await pageObjects.workflowExecution.expandStepsTree();

    // The parallel node is present and both named branches ran. Single-step
    // branches collapse into their step row labeled with the branch name.
    const parallelStep = await pageObjects.workflowExecution.getStep('enrich');
    await expect(parallelStep).toHaveCount(1);

    const virustotalBranch = await pageObjects.workflowExecution.getStep('enrich > virustotal');
    await expect(virustotalBranch).toHaveCount(1);

    const geoipBranch = await pageObjects.workflowExecution.getStep('enrich > geoip');
    await expect(geoipBranch).toHaveCount(1);

    // The downstream step runs after all branches join.
    const afterJoin = await pageObjects.workflowExecution.getStep('after_join');
    await expect(afterJoin).toHaveCount(1);
  });

  test('fans out a foreach body once per item and joins downstream', async ({ pageObjects }) => {
    await pageObjects.workflowEditor.gotoNewWorkflow();
    await pageObjects.workflowEditor.setYamlEditorValue(
      getForeachFanOutParallelWorkflowYaml('Parallel foreach fan-out')
    );
    await pageObjects.workflowEditor.saveWorkflow();

    await pageObjects.workflowEditor.clickRunButton();
    await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

    await pageObjects.workflowExecution.expandStepsTree();

    const parallelStep = await pageObjects.workflowExecution.getStep('fan_out');
    await expect(parallelStep).toHaveCount(1);

    // The foreach body ran once per item (3 items -> 3 process_item steps).
    const processItemButtons = pageObjects.workflowExecution.executionPanel.getByRole('button', {
      name: 'process_item',
    });
    await expect(processItemButtons).toHaveCount(3);

    // The downstream step runs after the fan-out joins.
    const afterFanOut = await pageObjects.workflowExecution.getStep('after_fan_out');
    await expect(afterFanOut).toHaveCount(1);
  });
});
