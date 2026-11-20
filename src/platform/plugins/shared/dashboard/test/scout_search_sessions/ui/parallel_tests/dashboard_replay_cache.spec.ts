/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Coming back to a dashboard replays the cached responses of its panels and controls: those of the
 * first load, and those of the session started by a Refresh or a time range change.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';
import {
  countSearchesOnReturn,
  getReplayCacheDashboard,
  readResults,
  refetchDashboard,
} from '../fixtures/replay_cache';

/** The window the logstash-* archive holds documents in, so the changed range still has results. */
const LOGSTASH_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

const OS_FILTER = { field: 'machine.os.raw', operator: 'is', value: 'ios' } as const;

spaceTest.describe('Dashboard replay cache', { tag: '@local-stateful-classic' }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    const { data: dataView } = await apiServices.dataViews.create({
      title: 'logstash-*',
      timeFieldName: '@timestamp',
      spaceId: scoutSpace.id,
    });
    dashboardId = await apiServices.dashboard.create(
      getReplayCacheDashboard(dataView.id),
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithId(dashboardId);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'replays panels and controls when coming back',
    async ({ page, pageObjects, network }) => {
      const { controls, dashboard } = pageObjects;
      const results = await readResults(page, controls);

      expect(await countSearchesOnReturn(dashboard, network)).toBe(0);
      expect(await readResults(page, controls)).toStrictEqual(results);
    }
  );

  spaceTest('replays the session started by Refresh', async ({ page, pageObjects, network }) => {
    const { controls, dashboard } = pageObjects;
    const refreshButton = page.testSubj.locator('querySubmitButton');
    await countSearchesOnReturn(dashboard, network);
    await expect(refreshButton).toHaveAttribute('aria-label', /^Updated /);

    await refetchDashboard(dashboard, network, () => dashboard.refresh());
    await expect(refreshButton).toHaveAttribute('aria-label', 'Refresh query');
    const results = await readResults(page, controls);

    expect(await countSearchesOnReturn(dashboard, network)).toBe(0);
    expect(await readResults(page, controls)).toStrictEqual(results);
  });

  spaceTest(
    'replays the session started by a time range change',
    async ({ page, pageObjects, network }) => {
      const { controls, dashboard, datePicker } = pageObjects;
      await refetchDashboard(dashboard, network, () => datePicker.setAbsoluteRange(LOGSTASH_RANGE));
      const results = await readResults(page, controls);

      expect(await countSearchesOnReturn(dashboard, network)).toBe(0);
      expect(await readResults(page, controls)).toStrictEqual(results);
    }
  );

  spaceTest(
    'fetches again after the pinned filters change, then replays',
    async ({ page, pageObjects, network }) => {
      const { controls, dashboard, filterBar } = pageObjects;
      await filterBar.addFilter(OS_FILTER);
      await dashboard.waitForRenderComplete();
      // Pinning changes the context the session was registered with, without starting a new one.
      await filterBar.toggleFilterPinned(OS_FILTER.field);

      expect(await countSearchesOnReturn(dashboard, network)).toBeGreaterThan(0);
      const results = await readResults(page, controls);

      expect(await countSearchesOnReturn(dashboard, network)).toBe(0);
      expect(await readResults(page, controls)).toStrictEqual(results);
    }
  );
});
