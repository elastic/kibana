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
import { WorkflowsApiService } from '../../../scout/common/apis/workflows';
import { test } from '../../../scout/ui/fixtures';
import {
  createUiamServiceAccountContext,
  getElasticsearchWorkflowYaml,
  uniqueTestId,
} from '../../common/service_account_test_utils';

const cleanupWorkflow = async (
  workflows: WorkflowsApiService,
  workflowId: string
): Promise<void> => {
  await workflows.update(workflowId, { enabled: false });
  const deadline = Date.now() + 30_000;
  let lastError: Error | undefined;

  do {
    try {
      await workflows.hardDelete(workflowId);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  } while (Date.now() < deadline);

  throw lastError ?? new Error(`Failed to delete workflow ${workflowId}`);
};

test.describe(
  'Workflow service-account browser execution',
  { tag: tags.serverless.security.complete },
  () => {
    test.setTimeout(120_000);

    test('binds in the browser and queries Elasticsearch as the selected account', async ({
      browserAuth,
      esClient,
      kbnClient,
      log,
      page,
      pageObjects,
      config: { organizationId, projectType },
    }) => {
      if (!organizationId || !projectType) {
        throw new Error('UIAM organization and project type are required');
      }

      const testId = uniqueTestId('browser-native-sa');
      const workflowName = 'Browser native service-account E2E';
      const indexName = `${testId}-index`;
      const proofId = `${testId}-proof`;
      const expectedMessage = 'Browser-bound workflow queried the seeded document';
      const uiam = await createUiamServiceAccountContext({ organizationId, projectType });
      const workflows = new WorkflowsApiService('default', kbnClient);
      let workflowId: string | undefined;

      try {
        const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
        await esClient.index({
          index: indexName,
          id: proofId,
          document: { proof_id: proofId, message: expectedMessage },
          refresh: 'wait_for',
        });
        const workflow = await workflows.create(
          getElasticsearchWorkflowYaml({
            name: workflowName,
            indexName,
            proofId,
          })
        );
        workflowId = workflow.id;

        await browserAuth.loginAsAdmin();
        await pageObjects.workflowEditor.gotoWorkflow(workflowId);
        await pageObjects.workflowEditor.selectRunAsServiceAccount(serviceAccount.name);
        await expect
          .poll(() => pageObjects.workflowEditor.getYamlEditorValue())
          .toContain(`run_as: ${serviceAccount.id}`);
        await pageObjects.workflowEditor.saveWorkflow();

        const savedWorkflow = await workflows.getWorkflow(workflowId);
        expect(savedWorkflow.yaml).toContain(`run_as: ${serviceAccount.id}`);

        await pageObjects.workflowList.navigate();
        await page.testSubj.waitForSelector('workflowListTable', { state: 'visible' });
        const workflowRow = pageObjects.workflowList.getWorkflowRow(workflowName);
        await workflowRow.getByRole('button', { name: 'Run' }).click();
        const executeModal = page.testSubj.locator('workflowExecuteModal');
        await expect
          .poll(async () => (await executeModal.isVisible()) || page.url().includes('executionId='))
          .toBe(true);
        if (await executeModal.isVisible()) {
          await page.testSubj.click('executeWorkflowButton');
        }
        await pageObjects.workflowExecution.waitForExecutionStatus('completed', 60_000);

        const executionId = new URL(page.url()).searchParams.get('executionId');
        if (!executionId) {
          throw new Error(`Execution ID is missing from ${page.url()}`);
        }
        const execution = await workflows.getExecution(executionId, { includeOutput: true });
        if (!execution) {
          throw new Error(`Execution ${executionId} was not found`);
        }
        expect(execution.status).toBe('completed');
        expect(execution.executedBy).toBeTruthy();
        expect(execution.executedBy).not.toBe(serviceAccount.id);
        expect(execution.effectiveIdentity).toBe(serviceAccount.id);
        expect(JSON.stringify(execution.stepExecutions)).toContain(expectedMessage);
        log.info(
          `RESULT browser_bind_run=passed execution=${executionId} url=${page.url()} executedBy=${
            execution.executedBy
          } effectiveIdentity=${execution.effectiveIdentity}`
        );
      } finally {
        if (workflowId) {
          await cleanupWorkflow(workflows, workflowId);
        }
        await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
        await uiam.cleanup();
      }
    });

    test('shows the resolved service-account name and ID on an execution', async ({
      browserAuth,
      esClient,
      kbnClient,
      log,
      page,
      pageObjects,
      config: { organizationId, projectType },
    }) => {
      if (!organizationId || !projectType) {
        throw new Error('UIAM organization and project type are required');
      }

      const testId = uniqueTestId('identity-native-sa');
      const indexName = `${testId}-index`;
      const proofId = `${testId}-proof`;
      const uiam = await createUiamServiceAccountContext({ organizationId, projectType });
      const workflows = new WorkflowsApiService('default', kbnClient);
      let workflowId: string | undefined;

      try {
        const serviceAccount = await uiam.createServiceAccount(`${testId}-account`);
        await esClient.index({
          index: indexName,
          id: proofId,
          document: { proof_id: proofId, message: 'Identity rendering proof' },
          refresh: 'wait_for',
        });
        const workflow = await workflows.create(
          getElasticsearchWorkflowYaml({
            name: 'Service-account identity rendering E2E',
            indexName,
            proofId,
            serviceAccountId: serviceAccount.id,
          })
        );
        workflowId = workflow.id;
        const { workflowExecutionId: executionId } = await workflows.run(workflowId, {});
        const execution = await workflows.waitForTermination({
          workflowExecutionId: executionId,
          timeout: 60_000,
        });
        expect(execution?.status).toBe('completed');

        await browserAuth.loginAsAdmin();
        await pageObjects.workflowExecution.gotoWorkflowExecution(workflowId, executionId);

        await expect(page.testSubj.locator('workflowExecutionEffectiveIdentity')).toHaveText(
          serviceAccount.name
        );
        await expect(page.testSubj.locator('workflowExecutionEffectiveIdentityId')).toHaveText(
          serviceAccount.id
        );
        log.info(
          `RESULT execution_identity_ui=passed execution=${executionId} serviceAccount=${serviceAccount.name} (${serviceAccount.id})`
        );
      } finally {
        if (workflowId) {
          await cleanupWorkflow(workflows, workflowId);
        }
        await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
        await uiam.cleanup();
      }
    });
  }
);
