/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Automated a11y scans of the Discover page and its top-nav surfaces: the
 * default view, the save-search flow, the open-search flyout, the inspector,
 * the share modal, the histogram controls, and the field statistics view.
 *
 * Page-level scans are scoped to `dscPage`, which covers the Discover page
 * including its top nav. Two things sit outside it: the global Kibana chrome,
 * which other suites own, and the unified tabs bar, which carries a known
 * `aria-required-children` violation (see the note on PAGE_TEST_SUBJ below).
 * They also leave out the data grid, which has its own a11y spec (see the note
 * on DOC_TABLE_TEST_SUBJ).
 *
 * Modals, flyouts and popovers render through EUI portals and so mount outside
 * `dscPage`; each of those scans targets the overlay directly.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

/**
 * Discover page root, including the top nav.
 *
 * Deliberately excludes the unified tabs bar, which renders above it: the tabs
 * bar sets `role="tablist"` on a container whose children are the drag-and-drop
 * wrapper rather than `role="tab"` elements, which axe reports as
 * `aria-required-children` (critical). That is a pre-existing `@kbn/unified-tabs`
 * defect the FTR suite never surfaced, because `AXE_CONFIG` narrows that rule to
 * the KQL input's subtree. Scanning the tabs bar here would fail on a defect
 * this suite does not own; it should be covered again once that is fixed.
 */
const PAGE_TEST_SUBJ = '[data-test-subj="dscPage"]';

/**
 * Excluded from the page-level scans below. EUI's virtualized data-grid body
 * (`.euiDataGrid__virtualized`) scrolls without being keyboard focusable, which
 * axe reports as `scrollable-region-focusable` (serious). The violation is
 * pre-existing EUI behaviour — the doc-viewer a11y spec scopes out its own
 * fields grid for the identical rule — and it only fires when the body actually
 * overflows, so it depends on viewport and row count rather than on anything
 * these scans are testing. The grid is covered directly by
 * `data_grid_accessibility.spec.ts`, so page-level scans leave it out.
 */
const DOC_TABLE_TEST_SUBJ = '[data-test-subj="discoverDocTable"]';

const SAVE_MODAL_TEST_SUBJ = '[data-test-subj="savedObjectSaveModal"]';
const OPEN_SEARCH_FLYOUT_TEST_SUBJ = '[data-test-subj="loadSearchForm"]';
const INSPECTOR_PANEL_TEST_SUBJ = '[data-test-subj="inspectorPanel"]';
const SHARE_MODAL_TEST_SUBJ = '[data-test-subj="shareContextModal"]';
const INTERVAL_POPOVER_TEST_SUBJ =
  '[data-test-subj="unifiedHistogramTimeIntervalSelectorSelectable"]';

spaceTest.describe('Discover app - accessibility', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
    // Modals, flyouts and popovers animate in; axe can otherwise scan a
    // half-rendered frame and report transient violations.
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
          include: [PAGE_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });

      await spaceTest.step('after clicking New', async () => {
        await pageObjects.discover.clickNewSearch();

        const { violations } = await page.checkA11y({
          include: [PAGE_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);
      });
    }
  );

  spaceTest('has no automated a11y violations in the save flow', async ({ page, pageObjects }) => {
    const { discover } = pageObjects;

    await spaceTest.step('save modal opened', async () => {
      await discover.openSaveSearchModal();

      const { violations } = await page.checkA11y({ include: [SAVE_MODAL_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);
    });

    await spaceTest.step('title entered', async () => {
      await discover.saveModal.fillTitle('a11ySearch');

      const { violations } = await page.checkA11y({ include: [SAVE_MODAL_TEST_SUBJ] });
      expect(violations).toStrictEqual([]);
    });

    await spaceTest.step('save confirmed', async () => {
      await discover.saveModal.confirm();
      await discover.waitUntilTabIsLoaded();

      const { violations } = await page.checkA11y({
        include: [PAGE_TEST_SUBJ],
        exclude: [DOC_TABLE_TEST_SUBJ],
      });
      expect(violations).toStrictEqual([]);
    });
  });

  spaceTest(
    'has no automated a11y violations in the top nav overlays',
    async ({ page, pageObjects }) => {
      const { discover, inspector } = pageObjects;

      await spaceTest.step('open-search flyout', async () => {
        // Populated by the standard Discover archive, which ships saved searches.
        await discover.clickAppMenuItem('discoverOpenButton');
        await page.testSubj.locator('loadSearchForm').waitFor({ state: 'visible' });

        const { violations } = await page.checkA11y({
          include: [OPEN_SEARCH_FLYOUT_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);

        await page.testSubj.click('euiFlyoutCloseButton');
        await page.testSubj.locator('loadSearchForm').waitFor({ state: 'hidden' });
      });

      await spaceTest.step('inspector flyout', async () => {
        await inspector.open();

        const { violations } = await page.checkA11y({ include: [INSPECTOR_PANEL_TEST_SUBJ] });
        expect(violations).toStrictEqual([]);

        await inspector.close();
      });

      await spaceTest.step('share modal', async () => {
        await discover.clickAppMenuItem('shareTopNavButton');
        await page.testSubj.locator('shareContextModal').waitFor({ state: 'visible' });

        const { violations } = await page.checkA11y({ include: [SHARE_MODAL_TEST_SUBJ] });
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
          include: [PAGE_TEST_SUBJ],
          exclude: [DOC_TABLE_TEST_SUBJ],
        });
        expect(violations).toStrictEqual([]);

        await discover.showChart();
      });

      await spaceTest.step('interval selector popover', async () => {
        await discover.openChartIntervalSelector();

        const { violations } = await page.checkA11y({ include: [INTERVAL_POPOVER_TEST_SUBJ] });
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
        include: [PAGE_TEST_SUBJ],
        exclude: [DOC_TABLE_TEST_SUBJ],
      });
      expect(violations).toStrictEqual([]);
    }
  );
});
