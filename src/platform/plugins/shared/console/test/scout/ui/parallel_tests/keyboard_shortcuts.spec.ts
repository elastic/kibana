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

// Two requests whose responses cannot be confused, so executing "the current request"
// after a jump says which request the cursor landed on.
const KIBANA_REQUEST = 'GET kbn:/api/spaces/space';
const SEARCH_REQUEST = 'GET _search';
const KIBANA_RESPONSE = '"name": "Default"';
const SEARCH_RESPONSE = '"hits"';

spaceTest.describe('Console keyboard shortcuts', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.console.goto();
    await pageObjects.console.skipTourIfExists();
    await pageObjects.console.clearEditorText();
  });

  spaceTest('opens and closes the shortcuts popover', async ({ pageObjects }) => {
    await expect(pageObjects.console.shortcutsPopoverContent).toBeHidden();

    await pageObjects.console.toggleShortcutsPopover();
    await expect(pageObjects.console.shortcutsPopoverContent).toBeVisible();

    await pageObjects.console.toggleShortcutsPopover();
    await expect(pageObjects.console.shortcutsPopoverContent).toBeHidden();
  });

  spaceTest('executes the request on Ctrl+Enter', async ({ pageObjects }) => {
    await pageObjects.console.enterText(SEARCH_REQUEST);
    await pageObjects.console.pressShortcut('ControlOrMeta+Enter');

    await expect(pageObjects.console.outputEditorContent).toContainText('"timed_out": false');
  });

  spaceTest('auto indents the current request on Ctrl+I', async ({ pageObjects }) => {
    await pageObjects.console.enterText('GET _search\n{"query": {"match_all": {}}}');
    await pageObjects.console.pressShortcut('ControlOrMeta+i');

    await expect
      .poll(() => pageObjects.console.getEditorText())
      .toBe('GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}');
  });

  spaceTest('jumps to the previous request on Ctrl+Up', async ({ pageObjects }) => {
    await pageObjects.console.enterText(`${KIBANA_REQUEST}\n${SEARCH_REQUEST}`);

    await pageObjects.console.pressShortcut('ControlOrMeta+ArrowUp');
    await pageObjects.console.pressShortcut('ControlOrMeta+Enter');

    await expect(pageObjects.console.outputEditorContent).toContainText(KIBANA_RESPONSE);
  });

  spaceTest('jumps back to the next request on Ctrl+Down', async ({ pageObjects }) => {
    await pageObjects.console.enterText(`${KIBANA_REQUEST}\n${SEARCH_REQUEST}`);

    await pageObjects.console.pressShortcut('ControlOrMeta+ArrowUp');
    await pageObjects.console.pressShortcut('ControlOrMeta+ArrowDown');
    await pageObjects.console.pressShortcut('ControlOrMeta+Enter');

    await expect(pageObjects.console.outputEditorContent).toContainText(SEARCH_RESPONSE);
  });

  spaceTest(
    'opens the API reference of the current request on Ctrl+/',
    async ({ page, pageObjects }) => {
      for (const request of ['GET _search', 'GET test_index/_search', 'GET /_search']) {
        await spaceTest.step(request, async () => {
          await pageObjects.console.clearEditorText();
          await pageObjects.console.enterText(request);

          const documentationTab = page.context().waitForEvent('page');
          await pageObjects.console.pressShortcut('ControlOrMeta+/');
          const documentationPage = await documentationTab;

          // All three shapes resolve to the search endpoint, whose reference page is
          // identified by `operation-search`. See `context_menu.spec.ts` for the rest.
          await expect.poll(() => documentationPage.url()).toContain('operation-search');
          await documentationPage.close();
        });
      }
    }
  );

  spaceTest('stops handling shortcuts once they are turned off', async ({ pageObjects }) => {
    await pageObjects.console.enterText(SEARCH_REQUEST);
    await pageObjects.console.setKeyboardShortcutsEnabled(false);

    // Assert the newline positively: the output panel's empty state is already visible
    // before the keystroke, so it would pass even if nothing were handled. The count comes
    // from Monaco's model because the rendered text trims the new line away.
    await pageObjects.console.pressShortcut('ControlOrMeta+Enter');

    await expect.poll(() => pageObjects.console.getModelLineCount()).toBe(2);
    await expect(pageObjects.console.outputPanelEmptyState).toBeVisible();

    await pageObjects.console.setKeyboardShortcutsEnabled(true);
  });
});
