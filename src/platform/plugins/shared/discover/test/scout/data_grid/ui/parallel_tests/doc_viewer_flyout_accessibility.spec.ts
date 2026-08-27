/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Focus management and a11y attributes of the Discover doc-viewer flyout.
 *
 * The doc viewer renders as a *push* flyout on wide viewports and as an
 * *overlay* flyout on narrow ones. The two modes differ in focus trapping
 * (`data-no-focus-lock`) and in whether a screen-reader description is
 * rendered, so every test here drives the viewport width deliberately.
 *
 * Migrated from `src/platform/test/functional/apps/discover/group9/_doc_viewer.ts`
 * (`flyout > accessibility` group).
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

/** Wide enough for the push flyout. Matches the FTR `browser.setWindowSize(1600, 1200)`. */
const PUSH_VIEWPORT = { width: 1600, height: 1200 };
/** Narrow enough to force the overlay flyout. Matches the FTR `reduceScreenWidth()`. */
const OVERLAY_VIEWPORT = { width: 800, height: 1200 };

/**
 * Excluded from the a11y scan below. The fields table renders an `EuiDataGrid`
 * whose virtualized body scrolls without being keyboard focusable, which axe
 * reports as `scrollable-region-focusable` (serious). The violation is
 * pre-existing and lives in EUI's grid rather than in the flyout, so it is
 * scoped out to keep the rest of the flyout covered.
 */
const FIELDS_GRID_TEST_SUBJ = '[data-test-subj="UnifiedDocViewerTableGrid"]';

spaceTest.describe(
  'Discover doc viewer flyout - accessibility',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.use({ viewport: PUSH_VIEWPORT });

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

    spaceTest(
      'focuses the flyout on open and retains focus when resizing between push and overlay',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;
        const focused = page.locator(':focus');

        await spaceTest.step('push -> overlay -> push', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.setViewportSize(OVERLAY_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.setViewportSize(PUSH_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');
        });

        await spaceTest.step('overlay -> push -> overlay', async () => {
          await page.keyboard.press('Escape');
          await page.setViewportSize(OVERLAY_VIEWPORT);

          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.setViewportSize(PUSH_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.setViewportSize(OVERLAY_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');
        });
      }
    );

    spaceTest(
      'returns focus to the trigger element when the flyout is closed',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;
        const focused = page.locator(':focus');

        // The flyout takes focus a tick after `kbnDocViewer` becomes visible (and
        // again after a push<->overlay re-render). Escape only closes it while it
        // holds focus, so each step waits for that before pressing the key.
        await spaceTest.step('opened and closed as a push flyout', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.keyboard.press('Escape');
          await expect(focused).toHaveAttribute('data-test-subj', 'docTableExpandToggleColumn');
        });

        await spaceTest.step('opened as push, closed as overlay', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await page.setViewportSize(OVERLAY_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.keyboard.press('Escape');
          await expect(focused).toHaveAttribute('data-test-subj', 'docTableExpandToggleColumn');
        });

        await spaceTest.step('opened and closed as an overlay flyout', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.keyboard.press('Escape');
          await expect(focused).toHaveAttribute('data-test-subj', 'docTableExpandToggleColumn');
        });

        await spaceTest.step('opened as overlay, closed as push', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await page.setViewportSize(PUSH_VIEWPORT);
          await expect(focused).toHaveAttribute('data-test-subj', 'docViewerFlyout');

          await page.keyboard.press('Escape');
          await expect(focused).toHaveAttribute('data-test-subj', 'docTableExpandToggleColumn');
        });
      }
    );

    spaceTest(
      'renders the screen reader description only for the push flyout',
      async ({ page, pageObjects }) => {
        const { docViewer } = pageObjects;

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        // Rendered inside `EuiScreenReaderOnly`, so it is attached but never visible.
        await expect(docViewer.getScreenReaderDescription()).toBeAttached();

        // The overlay flyout traps focus itself, so the extra description is dropped.
        await page.setViewportSize(OVERLAY_VIEWPORT);
        await expect(docViewer.getScreenReaderDescription()).toHaveCount(0);
      }
    );

    spaceTest('uses the expected a11y attributes', async ({ page, pageObjects }) => {
      const { docViewer } = pageObjects;
      const flyout = docViewer.getFlyoutContainer();

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      await spaceTest.step('push flyout', async () => {
        await expect(flyout).toHaveAttribute('role', 'dialog');
        await expect(flyout).toHaveAttribute('tabindex', '0');
        // Focus is not trapped, so the flyout opts out of the EUI focus lock.
        await expect(flyout).toHaveAttribute('data-no-focus-lock', 'true');

        const describedBy = await flyout.getAttribute('aria-describedby');
        await expect(page.locator(`[id="${describedBy}"]`)).toBeAttached();
      });

      await spaceTest.step('overlay flyout', async () => {
        await page.setViewportSize(OVERLAY_VIEWPORT);

        await expect(flyout).toHaveAttribute('role', 'dialog');
        await expect(flyout).toHaveAttribute('tabindex', '0');
        // The overlay flyout traps focus, so the opt-out attribute is absent.
        await expect(flyout).not.toHaveAttribute('data-no-focus-lock');

        const describedBy = await flyout.getAttribute('aria-describedby');
        await expect(page.locator(`[id="${describedBy}"]`)).toBeAttached();
      });
    });

    spaceTest('has no automated a11y violations', async ({ page, pageObjects }) => {
      const { docViewer } = pageObjects;

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      await spaceTest.step('push flyout', async () => {
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="docViewerFlyout"]'],
          exclude: [FIELDS_GRID_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('overlay flyout', async () => {
        await page.setViewportSize(OVERLAY_VIEWPORT);

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="docViewerFlyout"]'],
          exclude: [FIELDS_GRID_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });
    });
  }
);
