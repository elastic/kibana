/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout';
import { DEFAULT_INPUT_VALUE } from '../../../../common/constants';
import { test } from '../fixtures';

test.describe('console app', { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
  });

  test('should show the default request', async ({ pageObjects, log }) => {
    const actualRequest = await pageObjects.console.getEditorText();
    log.debug(actualRequest);
    expect(DEFAULT_INPUT_VALUE.replace(/\s/g, '')).toContain(actualRequest?.replace(/\s/g, ''));
  });

  test('output panel should initially be in empty state', async ({ pageObjects }) => {
    await pageObjects.console.getEditorText();
    expect(await pageObjects.console.isOutputPanelEmptyStateVisible()).toBe(true);
  });

  test('default request response should include "timed_out": false', async ({
    pageObjects,
    page,
    log,
  }) => {
    await pageObjects.console.clickClearOutput();
    const expectedResponseContains = `"timed_out": false`;
    await pageObjects.console.selectAllRequests();
    await pageObjects.console.clickPlay();

    // Wait for response with retry
    // let actualResponse = '';
    // await page.pause();
    // const outputPanel = page.testSubj.locator('consoleMonacoOutput');
    // const thing = outputPanel.locator('.monaco-scrollable-element');
    // await thing.waitFor();
    // const a = await outputPanel.all();
    // console.log('HIHIHIHIHIHI', a.length);
    // return outputPanel.locator('.monaco-scrollable-element');
    await expect(pageObjects.console.getOutputText()).toContainText(expectedResponseContains);

    // Output panel should no longer be in empty state
    expect(await pageObjects.console.isOutputPanelEmptyStateVisible()).toBe(false);
  });

  test('should resize the editor', async ({ pageObjects, page }) => {
    const editor = await pageObjects.console.getEditor();
    await page.setViewportSize({ width: 1300, height: 1100 });
    const initialSize = await editor.boundingBox();
    await page.setViewportSize({ width: 1000, height: 1100 });
    const afterSize = await editor.boundingBox();
    expect(initialSize!.width).toBeGreaterThan(afterSize!.width);
  });

  test('should allow clearing the input editor', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET _all');

    // Check current input is not empty
    const input = await pageObjects.console.getEditorText();
    expect(input).toBeTruthy();

    // Clear the input
    await pageObjects.console.clickClearInput();

    // Check that after clearing the input, the editor is empty
    const clearedInput = await pageObjects.console.getEditorText();
    expect(clearedInput).toBeFalsy();
  });

  test.describe('tabs navigation', () => {
    test.beforeEach(async ({ pageObjects }) => {
      // Starting from Shell tab
      await pageObjects.console.openConsole();
    });

    test('navigating to a tab updates the URL', async ({ pageObjects, page }) => {
      // Verify url at initial tab - Shell
      let currentUrl = page.url();
      expect(await pageObjects.console.isShellOpen()).toBe(true);
      expect(currentUrl).toContain('/shell');

      // Select History tab and verify URL
      await pageObjects.console.openHistory();
      expect(await pageObjects.console.isHistoryOpen()).toBe(true);
      currentUrl = page.url();
      expect(currentUrl).toContain('/history');

      // Select Config tab and verify URL
      await pageObjects.console.openConfig();
      expect(await pageObjects.console.isConfigOpen()).toBe(true);
      currentUrl = page.url();
      expect(currentUrl).toContain('/config');
    });

    test('tabs should be navigable through URL', async ({ pageObjects, page, log }) => {
      const shellTabUrl = page.url();

      // Navigate to History tab via URL
      await page.goto(shellTabUrl.replace('/shell', '/history'));
      let currentUrl = page.url();
      log.debug('Current URL: ' + currentUrl);
      expect(currentUrl).toContain('/history');
      await pageObjects.console.page.waitForLoadState('networkidle');
      expect(await pageObjects.console.isHistoryOpen()).toBe(true);

      // Navigate to Config tab via URL
      await page.goto(shellTabUrl.replace('/shell', '/config'));
      currentUrl = page.url();
      log.debug('Current URL: ' + currentUrl);
      expect(currentUrl).toContain('/config');
      await pageObjects.console.page.waitForLoadState('networkidle');
      expect(await pageObjects.console.isConfigOpen()).toBe(true);

      // Navigate to Shell tab via URL
      await page.goto(currentUrl.replace('/config', '/shell'));
      currentUrl = page.url();
      log.debug('Current URL: ' + currentUrl);
      expect(currentUrl).toContain('/shell');
      await pageObjects.console.page.waitForLoadState('networkidle');
      expect(await pageObjects.console.isShellOpen()).toBe(true);
    });
  });

  test('should send request with mixed case methods', async ({ pageObjects }) => {
    await pageObjects.console.clickClearInput();
    await pageObjects.console.enterText('Get /');
    await pageObjects.console.clickPlay();
    await pageObjects.console.getOutputText().innerText();
    expect(await pageObjects.console.getResponseStatus()).toBe(200);
  });

  test('should send successful request to Kibana API', async ({ pageObjects, log, page }) => {
    await pageObjects.console.clickClearInput();
    // todo improve match
    const expectedResponseContains = `"Default"`; // `"name": "Default"`;
    await pageObjects.console.enterText('GET kbn:/api/spaces/space');
    await pageObjects.console.clickPlay();
    const output = await pageObjects.console.getOutputText().innerText();
    expect(output.indexOf(expectedResponseContains)).not.toBe(-1);
  });

  test('with query params - should issue a successful request', async ({ pageObjects, page }) => {
    await pageObjects.console.clickClearInput();
    await pageObjects.console.enterText('GET _cat/aliases?format=json&v=true&pretty=true');
    await pageObjects.console.clickPlay();
    await pageObjects.console.page.waitForLoadState('networkidle');

    // Set the width of the browser, so that the response status is visible
    await page.setViewportSize({ width: 1300, height: 1100 });
    // todo should be able to use expect statment directly on status element
    const status = await pageObjects.console.getResponseStatus();
    expect(status).toBe(200);
  });

  test.describe('multiple requests output', () => {
    const sendMultipleRequests = async (pageObjects: any, requests: string[]) => {
      for (const request of requests) {
        await pageObjects.console.enterText(request);
      }
      await pageObjects.console.selectAllRequests();
      await pageObjects.console.clickPlay();
    };

    test.beforeEach(async ({ pageObjects }) => {
      await pageObjects.console.clickClearInput();
    });

    // todo
    test.skip('should contain comments starting with # symbol', async ({
      pageObjects,
      log,
      page,
    }) => {
      await sendMultipleRequests(pageObjects, ['PUT test-index\n', 'DELETE test-index']);

      // Wait for response with retry
      /*
      let response = '';
      for (let i = 0; i < 10; i++) {
        response = await pageObjects.console.getOutputText();
        if (
          response.includes('# 2: PUT test-index') &&
          response.includes('# 3: DELETE test-index')
        ) {
          break;
        }
        await pageObjects.console.page.waitForTimeout(500);
      }
        */
      const response = await pageObjects.console.getOutputText().innerText();

      log.debug(response);
      expect(response).toContain('PUT test-index [200 OK]'); // '# 2: PUT test-index [200 OK]'
      expect(response).toContain('DELETE test-index [200 OK]'); // '# 3: DELETE test-index [200 OK]'
    });

    // Not implemented for monaco yet https://github.com/elastic/kibana/issues/184010
    test.skip('should display status badges', async ({ pageObjects }) => {
      await sendMultipleRequests(pageObjects, ['\n GET _search/test', '\n GET _search']);
      await pageObjects.console.page.waitForLoadState('networkidle');
      expect(await pageObjects.console.hasWarningBadge()).toBe(true);
      expect(await pageObjects.console.hasSuccessBadge()).toBe(true);
    });
  });

  test('should show actions menu when the first line of the request is not in the viewport', async ({
    pageObjects,
    page,
  }) => {
    await pageObjects.console.clickClearInput();
    await pageObjects.console.enterText(`PUT _ingest/pipeline/testme
        {
          "processors": [
            {
              "inference": {
                "model_id": "azure_openai_embeddings",
                "input_output": {
                  "input_field": "body_content",
                  "output_field": "body_content_vector"
                },
                "if": "ctx?.body_content!=null",
                "ignore_failure": true,
                 "on_failure": [
                  {
                    "append": {
                      "field": "_source._ingest.inference_errors",
                      "allow_duplicates": false,
                      "value": [
                        {
                          "message": "...",
                          "pipeline": "ml-inference-search-edf-azureopenai-embeddings",
                          "timestamp": "{{{ _ingest.timestamp }}}"
                        }
                      ]
                    }
                  }
                ]
              }
            }
          ]
      }`);

    // Reduce the height of the browser window so that the first line of the request is not in the viewport
    await page.setViewportSize({ width: 1300, height: 500 });
    expect(await pageObjects.console.isPlayButtonVisible()).toBe(true);

    // Reset it back to the original height
    await page.setViewportSize({ width: 1300, height: 1100 });
  });

  test('shows OK when status code is 200 but body is empty', async ({ pageObjects, log }) => {
    await pageObjects.console.clickClearInput();

    // This request will return 200 but with an empty body
    await pageObjects.console.enterText('POST /_cluster/voting_config_exclusions?node_names=node');
    await pageObjects.console.clickPlay();

    // Wait for response with retry
    let actualResponse = '';
    for (let i = 0; i < 10; i++) {
      actualResponse = await pageObjects.console.getOutputText();
      if (actualResponse.includes('OK')) {
        break;
      }
      await pageObjects.console.page.waitForTimeout(500);
    }
    log.debug(actualResponse);
    expect(actualResponse).toContain('OK');
  });

  test('shows error body if HTTP request to server fails', async ({ pageObjects, log }) => {
    await pageObjects.console.clickClearInput();

    // This request will return 400 with an error body
    await pageObjects.console.enterText(
      'POST kbn:/api/alerting/rule/3603c386-9102-4c74-800d-2242e52bec98\n' +
        '{\n' +
        '  "name": "Alert on status change",\n' +
        '  "rule_type_id": ".es-querya"\n' +
        '}'
    );
    await pageObjects.console.clickPlay();

    const actualResponse = await pageObjects.console.getOutputText().innerText();

    console.log('hihi', actualResponse.indexOf('"statusCode": 400'));
    log.debug(actualResponse);
    expect(actualResponse).toContain('"statusCode": 400');
  });
});
