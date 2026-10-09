/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Arrow keys page between documents in the Discover doc-viewer flyout — except
 * when focus sits on an element that owns those keys itself (the field search
 * input, the data grid, the doc-viewer tabs, or the flyout resize handle).
 * Escape-to-close lives in `doc_viewer_flyout_escape_key.spec.ts`.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`flyout > keyboard navigation` group).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover doc viewer flyout - arrow keys',
  { tag: '@local-stateful-classic' },
  () => {
    // Required: above EUI's breakpoint the doc viewer renders as a push flyout
    // rather than an overlay. The push flyout keeps focus on the
    // `docViewerFlyout` container that owns the keydown handler. The overlay
    // traps focus inside itself (data-no-focus-lock is absent), so arrow keys
    // there never reach the handler either.
    spaceTest.use({ viewport: { width: 1600, height: 1200 } });

    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.dataGrid.waitForLoad();
      await pageObjects.dataGrid.waitForDocTableRendered();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    // The FTR suite opened and closed the flyout once in `beforeEach` to force
    // the table tab to be selected, because earlier `it` blocks in the same
    // browser session could leave another tab active. Scout gives every test a
    // fresh context and `doc_view_table` is the first registered tab, so no
    // warm-up is needed here.

    // The flyout takes focus a tick after `kbnDocViewer` becomes visible. Keys
    // sent before that go to the grid's expand toggle, which sits outside the
    // flyout and so never reaches its key handler — hence the focus assertion
    // before the first key press in every test that doesn't click first.

    spaceTest('navigates between documents with arrow keys', async ({ page, pageObjects }) => {
      const { docViewer } = pageObjects;

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
      await expect(docViewer.getNavigationPage(0)).toBeVisible();
      await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

      await page.keyboard.press('ArrowRight');
      await expect(docViewer.getNavigationPage(1)).toBeVisible();

      await page.keyboard.press('ArrowRight');
      await expect(docViewer.getNavigationPage(2)).toBeVisible();

      await page.keyboard.press('ArrowLeft');
      await expect(docViewer.getNavigationPage(1)).toBeVisible();

      await page.keyboard.press('ArrowLeft');
      await expect(docViewer.getNavigationPage(0)).toBeVisible();
    });

    spaceTest(
      'does not navigate between documents with arrow keys when the search input is focused',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getNavigationPage(0)).toBeVisible();
        await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        await docViewer.getFieldSearchInput().click();
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        // Tabbing out of the input hands the arrow keys back to the flyout.
        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(2)).toBeVisible();
      }
    );

    spaceTest(
      'does not navigate between documents with arrow keys when the data grid is focused',
      async ({ page, pageObjects }) => {
        const { dataGrid, docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getNavigationPage(0)).toBeVisible();
        await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        await dataGrid.getColumnHeader('name').click();
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(2)).toBeVisible();
      }
    );

    spaceTest(
      'does not navigate between documents with arrow keys when the tabs are focused',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getNavigationPage(0)).toBeVisible();
        await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        await docViewer.getTab('doc_view_source').click();
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();
      }
    );

    spaceTest(
      'does not navigate between documents with arrow keys when the resize handle is focused',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getNavigationPage(0)).toBeVisible();
        await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();

        await docViewer.getResizeHandle().click();
        await page.keyboard.press('ArrowRight');
        await expect(docViewer.getNavigationPage(1)).toBeVisible();
      }
    );
  }
);
