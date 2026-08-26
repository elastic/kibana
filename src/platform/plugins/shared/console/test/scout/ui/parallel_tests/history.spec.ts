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
import { spaceTest } from '../fixtures';

spaceTest.describe('Console history', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('lists executed requests and clears them', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET /_search?pretty');
    await pageObjects.console.sendRequest();

    await pageObjects.console.openHistoryTab();
    await expect(pageObjects.console.historyItems).toHaveCount(1);
    await expect(pageObjects.console.historyItems).toContainText('GET /_search?pretty');

    await pageObjects.console.clearHistory();
    await expect(pageObjects.console.historyItems).toHaveCount(0);
  });

  spaceTest('loads a request from history back into the editor', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
    await pageObjects.console.sendRequest();
    await pageObjects.console.clearEditorText();

    await pageObjects.console.openHistoryTab();
    await pageObjects.console.loadRequestFromHistory(0);

    // History re-indents the stored request.
    await expect
      .poll(() => pageObjects.console.getEditorText())
      .toContain('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
  });

  spaceTest('restores and runs a request from history', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
    await pageObjects.console.sendRequest();
    await pageObjects.console.clearEditorText();
    // Otherwise the response of the run above would satisfy the assertion below.
    await pageObjects.console.clickClearOutput();
    await expect(pageObjects.console.outputPanelEmptyState).toBeVisible();

    await pageObjects.console.openHistoryTab();
    await pageObjects.console.loadRequestFromHistory(0, true);

    await expect(pageObjects.console.outputEditorContent).toContainText('successful');
  });
});
