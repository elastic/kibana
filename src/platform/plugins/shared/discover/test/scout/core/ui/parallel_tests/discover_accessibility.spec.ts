/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the Discover page and its top-nav surfaces.
 *
 * Overlays render through EUI portals, so they mount outside the page root and
 * each of those scans targets the overlay directly.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

/** Page root, including the top nav. The tabs bar renders above it. */
const PAGE_TEST_SUBJ = '[data-test-subj="dscPage"]';

/** Scanned as a second root: the tabs bar sits outside the page root. */
const TABS_BAR_TEST_SUBJ = '[data-test-subj="unifiedTabs_tabsBar"]';

/**
 * Excluded from page scans: the tablist container holds its tabs through
 * `aria-owns` rather than as children, which axe reports as a pre-existing
 * `aria-required-children` violation in `@kbn/unified-tabs`. Scoped to the
 * tablist so the rest of the bar stays covered.
 */
const TABS_LIST_TEST_SUBJ = '[data-test-subj="unifiedTabs_tabsBar"] [role="tablist"]';

/**
 * Excluded from page scans: EUI's virtualized grid body reports
 * `scrollable-region-focusable` whenever it overflows. Covered instead by
 * `data_grid_accessibility.spec.ts`.
 */
const DOC_TABLE_TEST_SUBJ = '[data-test-subj="discoverDocTable"]';

const SAVE_MODAL_TEST_SUBJ = '[data-test-subj="savedObjectSaveModal"]';

spaceTest.describe('Discover app - accessibility', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // Overlays animate in; axe can otherwise scan a half-rendered frame.
    await discoverScoutSpace.uiSettings.set({ 'accessibility:disableAnimations': true });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // Privileged rather than viewer: the save-search flow writes a saved object.
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.uiSettings.unset('accessibility:disableAnimations');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'has no automated a11y violations on the main page or after starting a new search',
    async ({ page, pageObjects }) => {
      await spaceTest.step('main page', async () => {
        const { violations } = await page.checkA11y({
          include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ, TABS_LIST_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('after clicking New', async () => {
        await pageObjects.discover.clickNewSearch();

        const { violations } = await page.checkA11y({
          include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ, TABS_LIST_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });
    }
  );

  spaceTest(
    'has no automated a11y violations in the save flow',
    async ({ page, pageObjects }, testInfo) => {
      const { discover, toasts } = pageObjects;
      // Per-attempt title: cleanup only runs after retries, and the save modal
      // disables its confirm button on a duplicate.
      const savedSearchTitle = `a11ySearch-${testInfo.retry}`;

      await spaceTest.step('save modal opened', async () => {
        await discover.openSaveSearchModal();

        const { violations } = await page.checkA11y({ include: [SAVE_MODAL_TEST_SUBJ] });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('title entered', async () => {
        await discover.saveModal.fillTitle(savedSearchTitle);
        await expect(page.testSubj.locator('savedObjectTitle')).toHaveValue(savedSearchTitle);

        const { violations } = await page.checkA11y({ include: [SAVE_MODAL_TEST_SUBJ] });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('save confirmed', async () => {
        await discover.saveModal.confirm();
        // The modal closes before the save request resolves; the toast is the
        // first signal that it did.
        await toasts.waitForToastWithText(`Discover session '${savedSearchTitle}' was saved`);
        await toasts.dismissAll();
        await discover.waitUntilTabIsLoaded();

        const { violations } = await page.checkA11y({
          include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ, TABS_LIST_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });
    }
  );

  spaceTest(
    'has no automated a11y violations in the top nav overlays',
    async ({ page, pageObjects }) => {
      const { discover, inspector } = pageObjects;

      await spaceTest.step('open-search flyout', async () => {
        const loadSearchForm = page.testSubj.locator('loadSearchForm');

        await discover.clickAppMenuItem('discoverOpenButton');
        await loadSearchForm.waitFor({ state: 'visible' });
        // Scan a populated list, not the empty state: this entry comes from the
        // standard Discover archive loaded in `beforeAll`.
        await expect(page.testSubj.locator('savedObjectTitleA-Saved-Search')).toBeVisible();

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="loadSearchForm"]'],
        });
        expect(violations).toStrictEqual([]);

        await page.testSubj.click('euiFlyoutCloseButton');
        await loadSearchForm.waitFor({ state: 'hidden' });
      });

      await spaceTest.step('inspector flyout', async () => {
        await inspector.open();

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="inspectorPanel"]'],
        });
        expect(violations).toStrictEqual([]);

        await inspector.close();
      });

      await spaceTest.step('share modal', async () => {
        await discover.clickAppMenuItem('shareTopNavButton');
        await page.testSubj.locator('shareContextModal').waitFor({ state: 'visible' });

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="shareContextModal"]'],
        });
        expect(violations).toStrictEqual([]);

        await discover.closeShareModal();
      });
    }
  );

  spaceTest(
    'has no automated a11y violations in the histogram controls',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await spaceTest.step('histogram hidden', async () => {
        await discover.hideChart();

        const { violations } = await page.checkA11y({
          include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ, TABS_LIST_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);

        await discover.showChart();
      });

      await spaceTest.step('interval selector popover', async () => {
        await discover.openChartIntervalSelector();

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"]'],
        });
        expect(violations).toStrictEqual([]);
      });
    }
  );

  spaceTest(
    'has no automated a11y violations in the field statistics view',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.selectFieldStatisticsView();

      const { violations } = await page.checkA11y({
        include: [PAGE_TEST_SUBJ, TABS_BAR_TEST_SUBJ],
        exclude: [DOC_TABLE_TEST_SUBJ, TABS_LIST_TEST_SUBJ],
      });
      expect(violations).toStrictEqual([]);
    }
  );
});
