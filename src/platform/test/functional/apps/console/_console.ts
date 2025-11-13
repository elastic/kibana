/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { DEFAULT_INPUT_VALUE } from '@kbn/console-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const security = getService('security');

  describe('console app', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.console.skipTourIfExists();
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getEditorText();
        log.debug(actualRequest);
        expect(DEFAULT_INPUT_VALUE.replace(/\s/g, '')).to.contain(actualRequest.replace(/\s/g, ''));
      });
    });

    it('output panel should initially be in empty state', async () => {
      expect(await PageObjects.console.isOutputPanelEmptyStateVisible()).to.be(true);
    });

    it('default request response should include `"timed_out" : false`', async () => {
      await PageObjects.console.clickClearOutput();
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
      // Output panel should not longer be in empty state
      expect(await PageObjects.console.isOutputPanelEmptyStateVisible()).to.be(false);
    });

    it('should resize the editor', async () => {
      const editor = await PageObjects.console.getEditor();
      await browser.setWindowSize(1300, 1100);
      const initialSize = await editor.getSize();
      await browser.setWindowSize(1000, 1100);
      const afterSize = await editor.getSize();
      expect(initialSize.width).to.be.greaterThan(afterSize.width);
    });

    it('should allow clearing the input editor', async () => {
      await PageObjects.console.enterText('GET _all');

      // Check current input is not empty
      const input = await PageObjects.console.getEditorText();
      expect(input).to.not.be.empty();

      // Clear the output
      await PageObjects.console.clickClearInput();

      // Check that after clearing the input, the editor is empty
      expect(await PageObjects.console.getEditorText()).to.be.empty();
    });

    describe('tabs navigation', () => {
      let currentUrl: string;

      beforeEach(async () => {
        // Starting from Shell tab
        await PageObjects.console.openConsole();
      });

      it('navigating to a tab updates the URL', async () => {
        // Verify url at initial tab - Shell
        currentUrl = await browser.getCurrentUrl();
        expect(await PageObjects.console.isShellOpen()).to.be(true);
        expect(currentUrl).to.contain(`/shell`);

        // Select History tab and verify URL
        await PageObjects.console.openHistory();
        expect(await PageObjects.console.isHistoryOpen()).to.be(true);
        currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain(`/history`);

        // Select Config tab and verify URL
        await PageObjects.console.openConfig();
        expect(await PageObjects.console.isConfigOpen()).to.be(true);
        currentUrl = await browser.getCurrentUrl();
        expect(currentUrl).to.contain(`/config`);
      });

      it('tabs should be navigable through URL', async () => {
        const shellTabUrl = await browser.getCurrentUrl();

        // Navigate to History tab via URL
        await browser.get(shellTabUrl.replace('/shell', '/history'));
        currentUrl = await browser.getCurrentUrl();
        log.debug('Current URL: ' + currentUrl);
        expect(currentUrl).to.contain(`/history`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.isHistoryOpen()).to.be(true);

        // Navigate to Config tab via URL
        await browser.get(shellTabUrl.replace('/shell', '/config'));
        currentUrl = await browser.getCurrentUrl();
        log.debug('Current URL: ' + currentUrl);
        expect(currentUrl).to.contain(`/config`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.isConfigOpen()).to.be(true);

        // Navigate to Shell tab via URL
        await browser.get(currentUrl.replace('/config', '/shell'));
        currentUrl = await browser.getCurrentUrl();
        log.debug('Current URL: ' + currentUrl);
        expect(currentUrl).to.contain(`/shell`);
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await PageObjects.console.isShellOpen()).to.be(true);
      });
    });

    it('should send request with mixed case methods', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText('Get /');
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const status = await PageObjects.console.getResponseStatus();
        expect(status).to.eql(200);
      });
    });

    describe('with kbn: prefix in request', () => {
      before(async () => {
        await PageObjects.console.clearEditorText();
      });
      it('it should send successful request to Kibana API', async () => {
        const expectedResponseContains = '"name": "Default"';
        await PageObjects.console.enterText('GET kbn:/api/spaces/space');
        await PageObjects.console.clickPlay();
        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getOutputText();
          log.debug(actualResponse);
          expect(actualResponse).to.contain(expectedResponseContains);
        });
      });
    });

    describe('with query params', () => {
      it('should issue a successful request', async () => {
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _cat/aliases?format=json&v=true&pretty=true');
        await PageObjects.console.clickPlay();
        await PageObjects.header.waitUntilLoadingHasFinished();

        // set the width of the browser, so that the response status is visible
        await browser.setWindowSize(1300, 1100);
        await retry.try(async () => {
          const status = await PageObjects.console.getResponseStatus();
          expect(status).to.eql(200);
        });
      });
    });

    describe('multiple requests output', function () {
      const sendMultipleRequests = async (requests: string[]) => {
        await asyncForEach(requests, async (request) => {
          await PageObjects.console.enterText(request);
        });
        await PageObjects.console.selectAllRequests();
        await PageObjects.console.clickPlay();
      };

      before(async () => {
        await security.testUser.setRoles(['kibana_admin', 'test_index']);
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      beforeEach(async () => {
        await PageObjects.console.clearEditorText();
      });

      it('should contain comments starting with # symbol', async () => {
        await sendMultipleRequests(['\n PUT test-index', '\n DELETE test-index']);
        await retry.try(async () => {
          const response = await PageObjects.console.getOutputText();
          log.debug(response);
          expect(response).to.contain('# 2: PUT test-index [200 OK]');
          expect(response).to.contain('# 3: DELETE test-index [200 OK]');
        });
      });
    });

    it('should show actions menu when the first line of the request is not in the viewport', async () => {
      await PageObjects.console.clearEditorText();
      await PageObjects.console.enterText(`PUT _ingest/pipeline/testme
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
      await browser.setWindowSize(1300, 500);
      expect(await PageObjects.console.isPlayButtonVisible()).to.be(true);

      // Reset it back to the original height
      await browser.setWindowSize(1300, 1100);
    });

    it('Shows OK when status code is 200 but body is empty', async () => {
      await PageObjects.console.clearEditorText();

      // This request will return 200 but with an empty body
      await PageObjects.console.enterText(
        'POST /_cluster/voting_config_exclusions?node_names=node'
      );
      await PageObjects.console.clickPlay();

      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain('OK');
      });
    });

    it('Shows error body if HTTP request to server fails', async () => {
      await PageObjects.console.clearEditorText();

      // This request will return 200 but with an empty body
      await PageObjects.console.enterText(
        'POST kbn:/api/alerting/rule/3603c386-9102-4c74-800d-2242e52bec98\n' +
          '{\n' +
          '  "name": "Alert on status change",\n' +
          '  "rule_type_id": ".es-querya"\n' +
          '}'
      );
      await PageObjects.console.clickPlay();

      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain('"statusCode": 400');
      });
    });

    describe('Action panel copy to language button', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToApp('console');
        await PageObjects.console.skipTourIfExists();
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET _search');
      });

      it('should display copy to language button in action panel', async () => {
        const testSubjects = getService('testSubjects');

        // Verify the copy button exists in the action panel
        const copyButtonExists = await testSubjects.exists('copyToLanguageActionButton');
        expect(copyButtonExists).to.be(true);

        // Verify it's visible
        const copyButton = await testSubjects.find('copyToLanguageActionButton');
        expect(await copyButton.isDisplayed()).to.be(true);
      });

      it('should copy request as curl by default when copy button is clicked', async () => {
        const testSubjects = getService('testSubjects');
        const toasts = getService('toasts');

        // Select the request to make action panel appear
        await PageObjects.console.selectAllRequests();

        // Click the action panel copy button without changing language
        await testSubjects.click('copyToLanguageActionButton');

        // Verify toast message shows curl
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as curl');

        // Verify clipboard contains curl command
        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('curl -X GET');
        }
      });

      it('should copy request with selected language from context menu', async () => {
        const testSubjects = getService('testSubjects');
        const toasts = getService('toasts');

        // Select the request to make action panel appear
        await PageObjects.console.selectAllRequests();

        // Open context menu and change language to Python
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.changeDefaultLanguage('python');

        // Close the context menu by clicking on the editor
        await PageObjects.console.focusInputEditor();

        // Wait for context menu to close
        await retry.waitFor('context menu to close', async () => {
          return !(await PageObjects.console.isContextMenuOpen());
        });

        // Select the request again to ensure action panel is visible
        await PageObjects.console.selectAllRequests();

        // Click the action panel copy button
        await testSubjects.click('copyToLanguageActionButton');

        // Verify toast message shows Python
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as Python');

        // Verify clipboard contains Python code
        const canReadClipboard = await browser.checkBrowserPermission('clipboard-read');
        if (canReadClipboard) {
          const clipboardText = await browser.getClipboardValue();
          expect(clipboardText).to.contain('from elasticsearch import Elasticsearch');
        }
      });

      it('should copy kbn requests as curl', async () => {
        const testSubjects = getService('testSubjects');
        const toasts = getService('toasts');

        // First, set language to Python
        await PageObjects.console.selectAllRequests();
        await PageObjects.console.clickContextMenu();
        await PageObjects.console.changeDefaultLanguage('python');
        await PageObjects.console.focusInputEditor();

        // Wait for context menu to close
        await retry.waitFor('context menu to close', async () => {
          return !(await PageObjects.console.isContextMenuOpen());
        });

        // Clear and enter a Kibana request
        await PageObjects.console.clearEditorText();
        await PageObjects.console.enterText('GET kbn:/api/spaces/space');
        await PageObjects.console.selectAllRequests();

        // Click action panel copy button
        await testSubjects.click('copyToLanguageActionButton');

        // Verify it copies as curl (forced for Kibana requests)
        const resultToast = await toasts.getElementByIndex(1);
        const toastText = await resultToast.getVisibleText();

        if (toastText.includes('Write permission denied')) {
          log.debug('Write permission denied, skipping test');
          return;
        }

        expect(toastText).to.be('Request copied to clipboard as curl');
      });
    });
  });
}
