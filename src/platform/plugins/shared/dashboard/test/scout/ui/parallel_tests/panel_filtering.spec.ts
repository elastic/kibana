/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardApiDataInput } from '@kbn/as-code-dashboard-schema';
import { spaceTest, tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const FILTER_FIELD = 'geo.src';
const FILTER_VALUE = 'US';

const parseMetricValue = (text: string) => Number(text.replace(/[^\d.]/g, ''));

const TIME_RANGE = { from: '2015-09-19T06:31:44.000Z', to: '2015-09-23T18:31:44.000Z' };

const METRIC_PANEL: NonNullable<DashboardApiDataInput['panels']>[number] = {
  type: 'vis',
  grid: { x: 0, y: 0, w: 24, h: 10 },
  config: {
    type: 'metric',
    data_source: {
      type: 'data_view_spec',
      index_pattern: 'logstash-*',
      time_field: '@timestamp',
    },
    metrics: [{ type: 'primary', operation: 'count' }],
  },
};

spaceTest.describe('Panel filtering (dashboard)', { tag: tags.deploymentAgnostic }, () => {
  let filteredDashboardId: string;
  let unfilteredDashboardId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    filteredDashboardId = await apiServices.dashboard.create(
      {
        title: `Dashboard with saved filter - ${scoutSpace.id}`,
        time_range: TIME_RANGE,
        filters: [
          {
            type: 'condition',
            condition: { field: FILTER_FIELD, operator: 'is', value: FILTER_VALUE },
          },
        ],
        panels: [METRIC_PANEL],
      },
      scoutSpace.id
    );
    unfilteredDashboardId = await apiServices.dashboard.create(
      {
        title: `Dashboard without filters - ${scoutSpace.id}`,
        time_range: TIME_RANGE,
        panels: [METRIC_PANEL],
      },
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  // The dashboards have a single metric panel with a single tile.
  const getMetricValueLocator = (page: ScoutPage) =>
    page.testSubj.locator('mtrVis').locator('.echMetricText__valueBlock');

  const readMetricValue = async (page: ScoutPage) => {
    const metricValue = getMetricValueLocator(page);
    await expect(metricValue).toHaveText(/\d/);
    return parseMetricValue(await metricValue.innerText());
  };

  spaceTest('saved filter can be applied and disabled', async ({ page, pageObjects }) => {
    let filteredValue = 0;

    await spaceTest.step('saved filter is applied to the panel on dashboard load', async () => {
      await pageObjects.dashboard.openDashboardWithId(filteredDashboardId);
      await pageObjects.dashboard.waitForPanelsToLoad(1);
      expect(
        await pageObjects.filterBar.hasFilter({
          field: FILTER_FIELD,
          value: FILTER_VALUE,
          enabled: true,
        })
      ).toBe(true);

      filteredValue = await readMetricValue(page);
      expect(filteredValue).toBeGreaterThan(0);
    });

    await spaceTest.step(
      'disabling the filter updates the panel with unfiltered data',
      async () => {
        await pageObjects.filterBar.toggleFilterEnabled(FILTER_FIELD);
        await pageObjects.dashboard.waitForRenderComplete();

        expect(await pageObjects.filterBar.hasFilter({ field: FILTER_FIELD, enabled: false })).toBe(
          true
        );
        await expect
          .poll(async () => parseMetricValue(await getMetricValueLocator(page).innerText()))
          .toBeGreaterThan(filteredValue);
      }
    );
  });

  spaceTest('a filter added in the UI is applied to a panel', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(unfilteredDashboardId);
    await pageObjects.dashboard.waitForPanelsToLoad(1);
    const unfilteredValue = await readMetricValue(page);

    await pageObjects.filterBar.addFilter({
      field: FILTER_FIELD,
      operator: 'is',
      value: FILTER_VALUE,
    });
    await pageObjects.dashboard.waitForRenderComplete();

    await expect
      .poll(async () => parseMetricValue(await getMetricValueLocator(page).innerText()))
      .toBeLessThan(unfilteredValue);
  });

  spaceTest(
    'a pinned filter is applied to a panel the same as an unpinned filter',
    async ({ page, pageObjects }) => {
      await pageObjects.dashboard.openDashboardWithId(filteredDashboardId);
      await pageObjects.dashboard.waitForPanelsToLoad(1);
      const filteredValue = await readMetricValue(page);

      await pageObjects.filterBar.toggleFilterPinned(FILTER_FIELD);
      await pageObjects.dashboard.waitForRenderComplete();

      expect(
        await pageObjects.filterBar.hasFilter({
          field: FILTER_FIELD,
          enabled: true,
          pinned: true,
        })
      ).toBe(true);
      expect(await readMetricValue(page)).toBe(filteredValue);
    }
  );
});
