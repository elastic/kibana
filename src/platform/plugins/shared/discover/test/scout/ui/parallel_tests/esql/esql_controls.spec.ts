/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * ES|QL controls carried between Dashboard and Discover: opening a
 * dashboard-embedded ES|QL panel (with controls) in Discover, viewing/editing
 * an unlinked (by-value) panel's controls from Discover, and saving a
 * Discover ES|QL session with controls back to a dashboard.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';
import {
  ESQL_CONTROLS_DASHBOARD_KBN_ARCHIVE,
  ESQL_CONTROLS_DASHBOARD_TITLE,
  ESQL_CONTROLS_SAVED_SEARCH_TITLE,
  ESQL_CONTROLS_SESSION_KBN_ARCHIVE,
} from '../../fixtures/esql/constants';
import {
  getAllControlIds,
  getControlsCount,
  optionsListEnsurePopoverIsClosed,
  expectOptionsListSelection,
  optionsListOpenPopover,
  optionsListPopoverSelectOption,
} from '../../fixtures/esql/controls_helpers';

spaceTest.describe('Discover ES|QL controls', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(ESQL_CONTROLS_DASHBOARD_KBN_ARCHIVE);
    await scoutSpace.savedObjects.load(ESQL_CONTROLS_SESSION_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ enableESQL: true });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults', 'enableESQL');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'retains ES|QL controls and their state when opening a dashboard panel in Discover',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;

      await dashboard.goto();
      await dashboard.clickDashboardTitleLink(ESQL_CONTROLS_DASHBOARD_TITLE);
      await dashboard.waitForRenderComplete();
      await expect(page.testSubj.locator('controls-group-wrapper')).toBeVisible();

      // "Open in Discover" opens a new browser tab.
      const [discoverPage] = await Promise.all([
        page.context().waitForEvent('page'),
        dashboard.clickPanelAction('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'),
      ]);
      await discoverPage.waitForLoadState();

      // `discoverPage` is a plain Playwright `Page` (not a `ScoutPage`), since
      // Scout doesn't provide a `.testSubj` wrapper for tabs opened at runtime,
      // so this uses a plain attribute selector instead of `page.testSubj`.
      await expect(discoverPage.locator('[data-test-subj="dscPage"]')).toBeVisible({
        timeout: 30_000,
      });
      await expect(discoverPage.locator('[data-control-id="esql-control-1"]')).toBeVisible();
      await expect(discoverPage.locator('[data-test-subj="discoverDocTable"]')).toBeVisible();

      await discoverPage.close();
    }
  );

  spaceTest(
    'retains controls and their state when viewing an unlinked by-value panel in Discover',
    async ({ page, pageObjects }) => {
      const { dashboard } = pageObjects;

      await dashboard.goto();
      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(ESQL_CONTROLS_SAVED_SEARCH_TITLE);
      await dashboard.unlinkFromLibrary(ESQL_CONTROLS_SAVED_SEARCH_TITLE);
      await dashboard.saveDashboard('ESQL control unlink test dashboard');
      await dashboard.ensureViewMode();

      await dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_VIEW_SAVED_SEARCH',
        ESQL_CONTROLS_SAVED_SEARCH_TITLE
      );

      await pageObjects.discover.waitUntilTabIsLoaded();
      expect(await getControlsCount(page)).toBe(1);
    }
  );

  spaceTest(
    'persists updated control selections after saving from Discover',
    async ({ page, pageObjects }) => {
      const { dashboard, discover } = pageObjects;

      await dashboard.goto();
      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(ESQL_CONTROLS_SAVED_SEARCH_TITLE);
      await dashboard.unlinkFromLibrary(ESQL_CONTROLS_SAVED_SEARCH_TITLE);

      expect(await getControlsCount(page)).toBe(1);
      const [initialControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, initialControlId, 'AE');

      await dashboard.clickPanelAction(
        'embeddablePanelAction-editPanel',
        ESQL_CONTROLS_SAVED_SEARCH_TITLE
      );
      await discover.waitUntilTabIsLoaded();

      const [discoverControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, discoverControlId, 'AE');

      await optionsListOpenPopover(page, discoverControlId);
      await optionsListPopoverSelectOption(page, 'CN');
      await optionsListEnsurePopoverIsClosed(page, discoverControlId);
      await discover.waitUntilTabIsLoaded();
      await expectOptionsListSelection(page, discoverControlId, 'CN');

      await discover.clickSaveSearchButton();
      await dashboard.waitForRenderComplete();

      expect(await getControlsCount(page)).toBe(1);
      const [updatedControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, updatedControlId, 'CN');
    }
  );

  spaceTest(
    'discards control selection changes when cancelling from Discover',
    async ({ page, pageObjects }) => {
      const { dashboard, discover } = pageObjects;

      await dashboard.goto();
      await dashboard.openNewDashboard();
      await dashboard.addSavedSearch(ESQL_CONTROLS_SAVED_SEARCH_TITLE);
      await dashboard.unlinkFromLibrary(ESQL_CONTROLS_SAVED_SEARCH_TITLE);

      expect(await getControlsCount(page)).toBe(1);
      const [initialControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, initialControlId, 'AE');

      await dashboard.clickPanelAction(
        'embeddablePanelAction-editPanel',
        ESQL_CONTROLS_SAVED_SEARCH_TITLE
      );
      await discover.waitUntilTabIsLoaded();

      const [discoverControlId] = await getAllControlIds(page);
      await optionsListOpenPopover(page, discoverControlId);
      await optionsListPopoverSelectOption(page, 'CN');
      await optionsListEnsurePopoverIsClosed(page, discoverControlId);
      await discover.waitUntilTabIsLoaded();
      await expectOptionsListSelection(page, discoverControlId, 'CN');

      await discover.clickCancelButton();
      await dashboard.waitForRenderComplete();

      expect(await getControlsCount(page)).toBe(1);
      const [unchangedControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, unchangedControlId, 'AE');
    }
  );

  spaceTest(
    'creates a dashboard from a Discover ES|QL session with the selected control state',
    async ({ page, pageObjects }) => {
      const { discover, dashboard } = pageObjects;

      await discover.goto({ queryMode: 'esql' });
      await discover.loadSavedSearch(ESQL_CONTROLS_SAVED_SEARCH_TITLE);
      await discover.waitUntilTabIsLoaded();

      expect(await getControlsCount(page)).toBe(1);
      const [discoverControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, discoverControlId, 'AE');

      await optionsListOpenPopover(page, discoverControlId);
      await optionsListPopoverSelectOption(page, 'CN');
      await optionsListEnsurePopoverIsClosed(page, discoverControlId);
      await discover.waitUntilTabIsLoaded();
      await expectOptionsListSelection(page, discoverControlId, 'CN');

      await discover.clickSaveDiscoverTableToDashboard('ESQL control by-value table');
      await dashboard.waitForRenderComplete();

      await expect.poll(() => dashboard.getPanelTitles()).toContain('ESQL control by-value table');
      expect(await getControlsCount(page)).toBe(1);
      const [dashboardControlId] = await getAllControlIds(page);
      await expectOptionsListSelection(page, dashboardControlId, 'CN');
    }
  );
});
