/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Panels that outlive `search:timeout` surface a timeout error, and a dashboard whose panels
 * share one search session reports that error once rather than per panel.
 *
 * Local-only: the dashboard archive relies on the `shard_delay` aggregation, which only ships
 * with test builds.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  findLoadedDashboardId,
  DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const TIMED_OUT_DASHBOARD_TITLE = 'Delayed 15s';
// Holds four panels: one undelayed, one delayed 5s and two delayed 15s.
const MULTIPLE_DELAYED_DASHBOARD_TITLE = 'Multiple delayed';
const UNDELAYED_PANEL_TITLE = 'Sum of Bytes by Extension';
const DELAYED_PANEL_TITLE = 'Sum of Bytes by Extension (Delayed 5s)';

// Above the 5s panel's delay so its session id stays readable, below the 15s panels' so they
// time out.
const SEARCH_TIMEOUT_MS = 10_000;

spaceTest.describe('Dashboard search timeout', { tag: '@local-stateful-classic' }, () => {
  let timedOutDashboardId: string;
  let multipleDelayedDashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const loadedObjects = await scoutSpace.savedObjects.load(DASHBOARD_ASYNC_SEARCH_KBN_ARCHIVE);
    timedOutDashboardId = findLoadedDashboardId(loadedObjects, TIMED_OUT_DASHBOARD_TITLE);
    multipleDelayedDashboardId = findLoadedDashboardId(
      loadedObjects,
      MULTIPLE_DELAYED_DASHBOARD_TITLE
    );
    await scoutSpace.uiSettings.set({ 'search:timeout': SEARCH_TIMEOUT_MS });
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('search:timeout');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'reports an error when a panel outlives the search timeout',
    async ({ page, pageObjects }) => {
      // A panel that times out never reports render-complete, so don't wait for it.
      await pageObjects.dashboard.openDashboardWithId(timedOutDashboardId, {
        waitForRender: false,
      });

      await expect(page.testSubj.locator('searchTimeoutError')).toBeVisible({ timeout: 30_000 });
    }
  );

  spaceTest(
    'groups panels into one search session and reports a single timeout error',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(multipleDelayedDashboardId, {
        waitForRender: false,
      });

      const timeoutError = page.testSubj.locator('searchTimeoutError');

      await spaceTest.step('two panels time out but only one error is reported', async () => {
        await expect(timeoutError).toBeVisible({ timeout: 30_000 });
        await expect(timeoutError).toHaveCount(1);
      });

      let undelayedSessionId: string;

      await spaceTest.step('the panels share one search session', async () => {
        // The toast overlays the panels the inspector is opened from.
        await page.components.toast().closeAll();

        await pageObjects.dashboard.openInspector(UNDELAYED_PANEL_TITLE);
        undelayedSessionId = await pageObjects.inspector.getSearchSessionId();
        await pageObjects.dashboard.openInspector(DELAYED_PANEL_TITLE);
        const delayedSessionId = await pageObjects.inspector.getSearchSessionId();

        expect(delayedSessionId).toBe(undelayedSessionId);
      });

      await spaceTest.step('re-submitting starts a new session that is still shared', async () => {
        await page.testSubj.click('querySubmitButton');

        // The timeout error is raised once per dashboard visit, so it cannot be used to tell that
        // the second search cycle has started. The session id changing is the signal. Toasts are
        // closed on every attempt because they overlay the panels the inspector opens from.
        await expect
          .poll(
            async () => {
              await page.components.toast().closeAll();
              await pageObjects.dashboard.openInspector(UNDELAYED_PANEL_TITLE);
              const currentSessionId = await pageObjects.inspector.getSearchSessionId();
              return currentSessionId !== undelayedSessionId;
            },
            { timeout: 30_000 }
          )
          .toBe(true);

        await pageObjects.dashboard.openInspector(UNDELAYED_PANEL_TITLE);
        const newUndelayedSessionId = await pageObjects.inspector.getSearchSessionId();
        await pageObjects.dashboard.openInspector(DELAYED_PANEL_TITLE);
        const newDelayedSessionId = await pageObjects.inspector.getSearchSessionId();

        expect(newDelayedSessionId).toBe(newUndelayedSessionId);
        expect(newUndelayedSessionId).not.toBe(undelayedSessionId);
      });
    }
  );
});
