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

spaceTest.describe('Console context menu', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.gotoWithRequestLoaded('GET _search');
    await pageObjects.console.skipTourIfExists();
  });

  spaceTest(
    'opens with the copy, documentation and auto indent actions',
    async ({ pageObjects }) => {
      await expect(pageObjects.console.contextMenu).toBeHidden();

      await pageObjects.console.openContextMenu();

      await expect(pageObjects.console.copyAsMenuItem).toBeVisible();
      await expect(pageObjects.console.openDocsMenuItem).toBeVisible();
      await expect(pageObjects.console.autoIndentMenuItem).toBeVisible();
    }
  );

  spaceTest(
    'shows the keyboard shortcut badges of the auto indent and API reference actions',
    async ({ pageObjects }) => {
      await pageObjects.console.selectAllRequests();
      await pageObjects.console.openContextMenu();

      await expect(pageObjects.console.autoIndentShortcutBadge).toBeVisible();
      await expect(pageObjects.console.openDocsShortcutBadge).toBeVisible();
    }
  );

  spaceTest('auto indents the current request', async ({ pageObjects }) => {
    await pageObjects.console.clearEditorText();
    await pageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');

    await pageObjects.console.openContextMenu();
    await pageObjects.console.autoIndentMenuItem.click();

    await expect
      .poll(() => pageObjects.console.getEditorText())
      .toBe('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
  });

  spaceTest(
    'auto indents a comment inside the request body to its nesting level',
    async ({ pageObjects }) => {
      await pageObjects.console.clearEditorText();
      await pageObjects.console.enterText(
        'GET _search\n{"query": {\n# match every document\n"match_all": {}}}'
      );

      await pageObjects.console.openContextMenu();
      await pageObjects.console.autoIndentMenuItem.click();

      await expect
        .poll(() => pageObjects.console.getEditorText())
        .toBe(
          'GET _search\n{\n  "query": {\n    # match every document\n    "match_all": {}\n  }\n}'
        );
    }
  );

  spaceTest(
    'opens the API reference of the current request in a new tab',
    async ({ page, pageObjects }) => {
      await pageObjects.console.openContextMenu();

      const documentationTab = page.context().waitForEvent('page');
      await pageObjects.console.openDocsMenuItem.click();
      const documentationPage = await documentationTab;

      // Assert on the URL rather than the loaded page, so elastic.co needn't be reachable.
      // `operation-search` identifies the search endpoint's reference page on both stateful
      // and serverless. Polled: a popup can still be at `about:blank` when the event fires.
      await expect.poll(() => documentationPage.url()).toContain('operation-search');
      await documentationPage.close();
    }
  );
});
