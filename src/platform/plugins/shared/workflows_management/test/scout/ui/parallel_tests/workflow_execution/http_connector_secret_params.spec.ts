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

const CLIENT_ID = 'scout-client-id';
const CLIENT_SECRET = 'scout-client-secret';

test.describe(
  'HTTP connector workflow secret parameters',
  { tag: [...tags.stateful.classic] },
  () => {
    let connectorId: string | undefined;

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ scoutSpace, apiServices }) => {
      await cleanupWorkflowsAndRules({ scoutSpace, apiServices });
      if (connectorId) {
        await apiServices.alerting.connectors.delete(connectorId);
      }
    });

    test('creates secrets in the connector UI and resolves them only on the wire', async ({
      page,
      pageObjects,
      apiServices,
    }) => {
      await page.gotoApp('management/insightsAndAlerting/triggersActionsConnectors');
      await page.testSubj.locator('createConnectorButton').waitFor({ state: 'visible' });
      await page.testSubj.click('createConnectorButton');
      await page.testSubj.locator('.http-card').waitFor({ state: 'visible' });
      await page.testSubj.click('.http-card');

      await page.testSubj.locator('nameInput').fill('Scout workflow secret parameters');
      await page.testSubj.locator('httpUrlText').fill('https://httpbin.org');
      await page.testSubj.click('authNone');
      await page.testSubj.click('httpSecretParamsSwitch');

      const keyInputs = page.testSubj.locator('httpSecretParamKeyInput');
      const valueInputs = page.testSubj.locator('httpSecretParamValueInput');
      await expect(keyInputs).toHaveCount(1);
      const [clientIdKeyInput] = await keyInputs.all();
      const [clientIdValueInput] = await valueInputs.all();
      await clientIdKeyInput.fill('client_id');
      await clientIdValueInput.fill(CLIENT_ID);
      await page.testSubj.click('httpAddSecretParamButton');
      await expect(keyInputs).toHaveCount(2);
      const [, clientSecretKeyInput] = await keyInputs.all();
      const [, clientSecretValueInput] = await valueInputs.all();
      await clientSecretKeyInput.fill('client_secret');
      await clientSecretValueInput.fill(CLIENT_SECRET);

      const saveButton = page.testSubj.locator('create-connector-flyout-save-btn');
      if (await saveButton.isDisabled()) {
        throw new Error(await page.testSubj.locator('create-connector-flyout').innerText());
      }
      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/api/actions/connector'),
        { timeout: 20_000 }
      );
      await saveButton.click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBe(true);
      connectorId = ((await createResponse.json()) as { id: string }).id;

      const workflowYaml = `name: Scout HTTP connector secret parameters
enabled: true
inputs:
  - name: dummy
    type: string
    default: x
triggers:
  - type: manual
steps:
  - name: exchange_client_credentials
    type: http
    connector-id: ${connectorId}
    with:
      method: POST
      path: /anything
      headers:
        Content-Type: application/json
        Authorization: "Bearer {{ connector.secrets.client_secret }}"
      body:
        grant_type: client_credentials
        client_id: "{{ connector.secrets.client_id }}"
        client_secret: "{{ connector.secrets.client_secret }}"`;

      await pageObjects.workflowEditor.gotoNewWorkflow();
      await pageObjects.workflowEditor.setYamlEditorValue(workflowYaml);
      await pageObjects.workflowEditor.triggerAutocompleteAfter(
        workflowYaml,
        '{{ connector.secrets.'
      );
      const suggestions = pageObjects.workflowEditor.getYamlEditorSuggestWidget();
      await expect(suggestions).toBeVisible();
      await expect(suggestions.getByRole('option', { name: 'client_id' })).toBeVisible();
      await expect(suggestions.getByRole('option', { name: 'client_secret' })).toBeVisible();
      await page.keyboard.press('Escape');
      await pageObjects.workflowEditor.saveWorkflow();
      await pageObjects.workflowEditor.executeWorkflowWithInputs({ dummy: 'x' });
      await pageObjects.workflowExecution.waitForExecutionStatus('completed', EXECUTION_TIMEOUT);

      const executionId = new URL(page.url()).searchParams.get('executionId');
      expect(executionId).not.toBeNull();
      const execution = await apiServices.workflows.getExecution(executionId as string, {
        includeInput: true,
        includeOutput: true,
      });
      const stepExecution = execution?.stepExecutions?.find(
        ({ stepId }) => stepId === 'exchange_client_credentials'
      );
      expect(stepExecution).toBeDefined();

      const persistedInput = JSON.stringify(stepExecution?.input);
      expect(persistedInput).toContain('{{ connector.secrets.client_id }}');
      expect(persistedInput).toContain('{{ connector.secrets.client_secret }}');
      expect(persistedInput).not.toContain(CLIENT_ID);
      expect(persistedInput).not.toContain(CLIENT_SECRET);

      const persistedOutput = JSON.stringify(stepExecution?.output);
      expect(persistedOutput).toContain('[REDACTED]');
      expect(persistedOutput).not.toContain(CLIENT_ID);
      expect(persistedOutput).not.toContain(CLIENT_SECRET);
    });
  }
);
