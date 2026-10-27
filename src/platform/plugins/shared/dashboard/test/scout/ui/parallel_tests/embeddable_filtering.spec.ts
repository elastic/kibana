/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { EMBEDDABLE_FILTERING_ARCHIVE, EMBEDDABLE_FILTERING_DASHBOARD_TITLE } from '../constants';
import {
  getChartDebugState,
  getPieSlices,
  getPieSliceCount,
  PIE_CHART,
  POLL_OPTIONS,
} from '../../utils/chart_debug';
import { findImportedSavedObjectId } from '../../utils/migration_smoke_helpers';

const FILTER_FIELD = 'geo.dest';
const FILTER_VALUE = 'CN';

const getSliceNames = async (page: ScoutPage) =>
  getPieSlices(await getChartDebugState(page, PIE_CHART)).map(({ name }) => String(name));

let dashboardId = '';

// Focus: a filter saved with the dashboard is applied to an embeddable (Lens) panel, and disabling
// the filter updates the panel to show unfiltered data.
spaceTest.describe('Dashboard embeddable filtering', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    const imported = await scoutSpace.savedObjects.load(EMBEDDABLE_FILTERING_ARCHIVE);
    dashboardId = findImportedSavedObjectId(
      imported,
      'dashboard',
      EMBEDDABLE_FILTERING_DASHBOARD_TITLE
    );
    await scoutSpace.uiSettings.setDefaultIndex('logstash-*');
  });

  spaceTest.beforeEach(async ({ browserAuth, context }) => {
    // The elastic-charts debug state is read while a chart mounts, so enable it before navigation
    await context.addInitScript(() => {
      (window as unknown as { _echDebugStateFlag?: boolean })._echDebugStateFlag = true;
    });
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('lens chart is filtered by the dashboard filter', async ({ page, pageObjects }) => {
    const { dashboard, filterBar } = pageObjects;
    await dashboard.openDashboardWithId(dashboardId);
    await dashboard.waitForRenderComplete();

    let filteredSliceCount = 0;

    await spaceTest.step('chart only shows data matching the filter', async () => {
      expect(await filterBar.hasFilter({ field: FILTER_FIELD, value: FILTER_VALUE })).toBe(true);
      await expect.poll(() => getPieSliceCount(page), POLL_OPTIONS).toBeGreaterThan(0);
      await expect.poll(() => getSliceNames(page), POLL_OPTIONS).toContain(FILTER_VALUE);
      filteredSliceCount = await getPieSliceCount(page);
    });

    await spaceTest.step('disabling the filter shows data without the filter', async () => {
      await filterBar.toggleFilterEnabled(FILTER_FIELD);
      await dashboard.waitForRenderComplete();
      await expect
        .poll(() => getPieSliceCount(page), POLL_OPTIONS)
        .toBeGreaterThan(filteredSliceCount);
      await expect.poll(() => getSliceNames(page), POLL_OPTIONS).toContain(FILTER_VALUE);
    });
  });
});
