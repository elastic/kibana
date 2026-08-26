/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A background search saved from a dashboard that was never saved must restore both while the
 * draft is still live and after the draft has been discarded.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, deleteAllBackgroundSearches, FLIGHTS_SAMPLE_DATA_SET } from '../fixtures';

const SAVED_SEARCH_TITLE = 'Unsaved dashboard slow query';
const SLOW_ESQL_QUERY = 'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(1500ms)';

spaceTest.describe(
  'Background search from an unsaved dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.uiSettings.set({ enableESQL: true });
    });

    spaceTest.beforeEach(async ({ apiServices, browserAuth, pageObjects, scoutSpace }) => {
      await apiServices.sampleData.install(FLIGHTS_SAMPLE_DATA_SET, scoutSpace.id);

      await apiServices.discover.create(
        {
          title: SAVED_SEARCH_TITLE,
          tabs: [
            {
              id: 'slow-query',
              label: SAVED_SEARCH_TITLE,
              data_source: { type: 'esql', query: SLOW_ESQL_QUERY },
            },
          ],
        },
        scoutSpace.id
      );

      await browserAuth.loginAsPrivilegedUser();

      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary(SAVED_SEARCH_TITLE);
      // Re-submit so a search is genuinely in flight when we send it to the background.
      // Nothing is awaited after this: the "saved" toast auto-dismisses, and the first test
      // needs to still find its link. Each test waits for the render itself.
      await pageObjects.backgroundSearch.sendToBackground({ isSubmitButton: true });
    });

    spaceTest.afterEach(async ({ page, kbnUrl, pageObjects, scoutSpace }) => {
      await deleteAllBackgroundSearches({ page, kbnUrl, spaceId: scoutSpace.id });
      await scoutSpace.savedObjects.cleanStandardList();
      // The leftover "New Dashboard" draft would be restored by the next openNewDashboard(). It
      // has to be discarded from the listing: while the dashboard is mounted its unsaved-changes
      // manager keeps rewriting the session storage key, so clearing it in place is undone.
      await pageObjects.dashboard.discardUnsavedDashboard();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('enableESQL');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'restores the unsaved dashboard from the background search toast',
      async ({ page, pageObjects }) => {
        // The in-app flyout has no refresh button and does not auto-refresh, so completion is
        // polled from the management page instead.
        await pageObjects.backgroundSearch.openFlyoutFromToast();
        await pageObjects.backgroundSearch.closeFlyout();

        await pageObjects.backgroundSearchManagement.goTo();
        await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
        await pageObjects.backgroundSearchManagement.viewRow();

        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );

    spaceTest(
      'restores the unsaved dashboard after its draft has been discarded',
      async ({ page, pageObjects }) => {
        await pageObjects.dashboard.waitForRenderComplete();
        await pageObjects.dashboard.discardUnsavedDashboard();

        await pageObjects.backgroundSearchManagement.goTo();
        await pageObjects.backgroundSearchManagement.waitForRowStatus('complete');
        await pageObjects.backgroundSearchManagement.viewRow();

        await pageObjects.dashboard.waitForRenderComplete();
        await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);
        await expect(pageObjects.backgroundSearch.errorOrWarningToasts).toHaveCount(0);
      }
    );
  }
);
