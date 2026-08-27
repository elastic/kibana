/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Escape closes the Discover doc-viewer flyout — except while the data grid
 * holds focus, where the grid owns the key itself. Arrow-key paging lives in
 * `doc_viewer_flyout_arrow_keys.spec.ts`.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`flyout > keyboard navigation` group).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

spaceTest.describe(
  'Discover doc viewer flyout - escape key',
  { tag: '@local-stateful-classic' },
  () => {
    // Required: above EUI's breakpoint the doc viewer renders as a push flyout
    // rather than an overlay. The push flyout keeps focus on the
    // `docViewerFlyout` container that owns the keydown handler. The overlay
    // traps focus inside itself (data-no-focus-lock is absent), so escape there
    // closes the overlay rather than reaching the flyout's handler.
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

    spaceTest('closes the flyout', async ({ page, pageObjects }) => {
      const { docViewer } = pageObjects;

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
      // The flyout takes focus a tick after becoming visible. Keys sent before
      // that land on the grid's expand toggle (outside the flyout), so assert
      // focus before the first key press.
      await expect(page.locator(':focus')).toHaveAttribute('data-test-subj', 'docViewerFlyout');

      await page.keyboard.press('Escape');
      await expect(docViewer.getFlyout()).toBeHidden();
    });

    spaceTest(
      'closes the flyout when the search input is focused',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getFlyout()).toBeVisible();

        await docViewer.getFieldSearchInput().click();
        await page.keyboard.press('Escape');
        await expect(docViewer.getFlyout()).toBeHidden();
      }
    );

    spaceTest(
      'does not close the flyout when the data grid is focused',
      async ({ page, pageObjects }) => {
        const { dataGrid, docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await expect(docViewer.getFlyout()).toBeVisible();

        await dataGrid.getColumnHeader('name').click();
        await page.keyboard.press('Escape');
        await expect(docViewer.getFlyout()).toBeVisible();

        await page.keyboard.press('Tab');
        await page.keyboard.press('Escape');
        await expect(docViewer.getFlyout()).toBeHidden();
      }
    );
  }
);
