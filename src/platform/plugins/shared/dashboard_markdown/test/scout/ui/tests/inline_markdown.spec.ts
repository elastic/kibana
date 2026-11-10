/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPlaywrightTagsFor, spaceTest } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DASHBOARD_KBN_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';
const DEFAULT_INDEX_TITLE = 'logstash-*';

const ORIGINAL = {
  markdown: `# Original Heading 1
text
<h3>Inline HTML that should not be rendered as html</h3>
  `,
  result: 'Original Heading 1\ntext',
};

const MODIFIED = {
  markdown: `# Modified Heading 1
text
<h3>Inline HTML that should not be rendered as html</h3>
  `,
  result: 'Modified Heading 1\ntext',
};

spaceTest.describe(
  'Inline markdown panel',
  { tag: getPlaywrightTagsFor('stateful', 'classic', 'local') },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(DASHBOARD_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(DEFAULT_INDEX_TITLE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('create, discard, and edit flow', async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;
      const editor = page.locator('textarea[aria-label="Dashboard markdown editor"]');
      const renderer = page.testSubj.locator('markdownRenderer');
      const applyButton = page.testSubj.locator('markdownEditorApplyButton');
      const discardButton = page.testSubj.locator('markdownEditorDiscardButton');
      const previewTab = page.testSubj.locator('markdownEditorPreview');
      const editorTab = page.testSubj.locator('markdownEditorEditor');

      await dashboard.openNewDashboard();

      await spaceTest.step('adds a markdown panel and applies', async () => {
        await dashboard.openAddPanelFlyout();
        await page.testSubj.fill('dashboardPanelSelectionFlyout__searchInput', 'Markdown text');
        await page.testSubj.click('create-action-Markdown text');
        await expect(editor).toBeVisible();
        await editor.fill(ORIGINAL.markdown);
        await applyButton.click();
        await expect(editor).toBeHidden();
        expect(await dashboard.getPanelCount()).toBe(1);
        await expect(renderer).toHaveText(ORIGINAL.result);
      });

      await spaceTest.step('does not add a panel when discarded immediately', async () => {
        await dashboard.openAddPanelFlyout();
        await page.testSubj.fill('dashboardPanelSelectionFlyout__searchInput', 'Markdown text');
        await page.testSubj.click('create-action-Markdown text');
        await expect(editor).toBeVisible();
        await discardButton.click();
        await expect(editor).toBeHidden();
        await expect.poll(() => dashboard.getPanelCount()).toBe(1);
      });

      await spaceTest.step('discards unsaved edits and toggles preview/editor', async () => {
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await expect(editor).toBeVisible();
        await editor.fill('text that wont be saved');
        await previewTab.click();
        await expect(renderer).toHaveText('text that wont be saved');
        await editorTab.click();
        await expect(editor).toHaveValue('text that wont be saved');
        await discardButton.click();
        await expect(editor).toBeHidden();
        await expect(renderer).toHaveText(ORIGINAL.result);
      });

      await spaceTest.step('edits the panel and applies', async () => {
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await expect(editor).toBeVisible();
        await editor.fill(MODIFIED.markdown);
        await applyButton.click();
        await expect(editor).toBeHidden();
        await expect(renderer).toHaveText(MODIFIED.result);
        await expect(renderer.locator('h1')).toHaveText('Modified Heading 1');
      });
    });
  }
);
