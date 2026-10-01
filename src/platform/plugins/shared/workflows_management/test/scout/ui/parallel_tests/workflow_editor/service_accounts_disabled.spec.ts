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
import { ExecutionStatus } from '@kbn/workflows';
import { spaceTest as test } from '../../fixtures';
import { seedHistoricalServiceAccountIdentity } from '../../fixtures/service_account_ui';
import { getListTestWorkflowYaml } from '../../fixtures/workflows';

const ACCOUNT_ID = 'qa_saved_service_account';
const yaml = getListTestWorkflowYaml({
  name: 'Service accounts disabled',
  description: 'Feature flag UI regression',
  enabled: true,
});

test.describe(
  'Service account UI with the feature flag disabled',
  { tag: tags.stateful.classic },
  () => {
    let workflowId: string;
    let executionId: string;

    test.beforeAll(async ({ kbnClient, apiServices, esClient, scoutSpace }) => {
      const response = await kbnClient.request<{ message: string }>({
        method: 'GET',
        path: '/internal/security/service_account',
        ignoreErrors: [404],
      });
      expect(response.status).toBe(404);
      expect(response.data.message).toContain('the feature is disabled');

      const workflow = await apiServices.workflows.create(yaml);
      workflowId = workflow.id;
      const execution = await apiServices.workflows.run(workflowId, {});
      executionId = execution.workflowExecutionId;
      await apiServices.workflows.waitForStatus({
        workflowExecutionId: executionId,
        status: ExecutionStatus.COMPLETED,
      });

      // Seed historical identity metadata to represent an execution saved before the flag was disabled.
      await esClient.indices.refresh({ index: '.workflows-executions*' });
      const stored = await esClient.search({
        index: '.workflows-executions*',
        query: {
          bool: {
            filter: [{ ids: { values: [executionId] } }, { term: { spaceId: scoutSpace.id } }],
          },
        },
      });
      expect(stored.hits.hits).toHaveLength(1);
      await seedHistoricalServiceAccountIdentity(esClient, {
        index: stored.hits.hits[0]._index,
        executionId,
        accountId: ACCOUNT_ID,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ apiServices }) => {
      if (workflowId) await apiServices.workflows.hardDelete(workflowId);
    });

    test('omits run_as from settings autocomplete and inserted snippets', async ({
      pageObjects,
    }) => {
      const editor = pageObjects.workflowEditor;
      await editor.gotoWorkflow(workflowId);
      await editor.triggerAutocompleteAfter(`${yaml}\nsettings:\n  `, 'settings:\n  ');
      const suggestions = editor.getYamlEditorSuggestWidget();
      await expect(
        suggestions.getByRole('option', { name: 'timezone', exact: true })
      ).toBeVisible();
      await expect(suggestions.getByRole('option', { name: 'run_as', exact: true })).toBeHidden();

      await editor.dismissYamlSuggestions();
      await editor.triggerAutocompleteAfter(`${yaml}\nsett`, 'sett');
      await expect(
        suggestions.getByRole('option', { name: 'settings', exact: true })
      ).toBeVisible();
      await editor.acceptYamlSuggestion('settings');
      await expect.poll(() => editor.getYamlEditorValue()).toContain('settings:');
      expect(await editor.getYamlEditorValue()).not.toContain('run_as');
    });

    test('keeps a typed run_as ID without resolving names or showing account suggestions', async ({
      pageObjects,
      page,
    }) => {
      const directoryRequests: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.includes('/internal/security/service_account')) {
          directoryRequests.push(request.url());
        }
      });
      const editor = pageObjects.workflowEditor;
      await editor.gotoWorkflow(workflowId);
      await editor.triggerAutocompleteAfter(
        `${yaml}\nsettings:\n  run_as: ${ACCOUNT_ID}\n`,
        `run_as: ${ACCOUNT_ID}`
      );
      await expect(editor.yamlEditor).toContainText(ACCOUNT_ID);
      await expect(
        editor
          .getYamlEditorSuggestWidget()
          .getByRole('option', { name: /Load more service accounts/ })
      ).toBeHidden();
      await editor.dismissYamlSuggestions();
      await page.clock.install();
      await editor.hoverServiceAccountId(ACCOUNT_ID);
      // Flush delayed hover callbacks before checking that the directory was never called.
      await page.clock.runFor(1_000);
      await expect(editor.serviceAccountBadges).toHaveCount(0);
      await expect(editor.serviceAccountPopup).toBeHidden();
      expect(await editor.getYamlEditorValue()).toContain(`run_as: ${ACCOUNT_ID}`);
      expect(directoryRequests).toStrictEqual([]);
    });

    test('shows historical raw identity without name badges or directory calls', async ({
      pageObjects,
      page,
    }) => {
      const directoryRequests: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.includes('/internal/security/service_account')) {
          directoryRequests.push(request.url());
        }
      });
      const execution = pageObjects.workflowExecution;
      await execution.gotoOverview(workflowId, executionId);
      await expect(execution.serviceAccountIdentity).toHaveText(ACCOUNT_ID);
      await expect(execution.serviceAccountBadges).toHaveCount(0);
      await expect(execution.copyServiceAccountId).toBeHidden();
      expect(directoryRequests).toStrictEqual([]);
    });
  }
);
