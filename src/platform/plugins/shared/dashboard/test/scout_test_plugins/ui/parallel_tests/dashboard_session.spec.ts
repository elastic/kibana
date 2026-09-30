/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/data-plugin/test/scout_test_plugins/ui/fixtures';

spaceTest.describe('Dashboard search session lifecycle', { tag: '@local-stateful-classic' }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const objects = await scoutSpace.savedObjects.load(
      'src/platform/plugins/shared/dashboard/test/scout_test_plugins/ui/fixtures/kbn_archives/dashboard_with_filter.json'
    );
    const dashboard = objects.find(
      ({ type, title }) => type === 'dashboard' && title === 'dashboard with filter'
    );
    if (!dashboard) {
      throw new Error('The session lifecycle dashboard was not imported');
    }
    dashboardId = dashboard.id;
    await scoutSpace.uiSettings.set({ hideAnnouncements: true, 'dateFormat:tz': 'UTC' });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, sessionObserver }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.dashboard.openDashboardWithId(dashboardId);
    await pageObjects.dashboard.waitForPanelsToLoad(2);
    await expect.poll(() => sessionObserver.isAvailable()).toBe(true);
    await expect
      .poll(() => pageObjects.filterBar.hasFilter({ field: 'animal', value: 'dog' }))
      .toBe(true);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('hideAnnouncements', 'dateFormat:tz');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('on load there is a single session', async ({ sessionObserver }) => {
    // Keep load-time emissions: both panels should share one session.
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
  });

  spaceTest('starts a session on refresh', async ({ pageObjects, sessionObserver }) => {
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
    const [initialSessionId] = await sessionObserver.getSessionIds();
    await sessionObserver.clear();

    await pageObjects.dashboard.refresh();
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
    await pageObjects.dashboard.waitForRenderComplete();
    const sessionIds = await sessionObserver.getSessionIds();
    expect(sessionIds).toHaveLength(1);
    expect(sessionIds[0]).not.toBe(initialSessionId);
  });

  spaceTest('starts a session on filter change', async ({ pageObjects, sessionObserver }) => {
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
    const [initialSessionId] = await sessionObserver.getSessionIds();
    await sessionObserver.clear();

    await pageObjects.filterBar.removeFilter('animal');
    await expect
      .poll(() => pageObjects.filterBar.hasFilter({ field: 'animal', value: 'dog' }))
      .toBe(false);
    await expect.poll(() => sessionObserver.getSessionIds()).toHaveLength(1);
    await pageObjects.dashboard.waitForRenderComplete();
    const sessionIds = await sessionObserver.getSessionIds();
    expect(sessionIds).toHaveLength(1);
    expect(sessionIds[0]).not.toBe(initialSessionId);
  });
});
