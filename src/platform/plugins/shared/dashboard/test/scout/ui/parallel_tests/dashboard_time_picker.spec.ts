/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createMetricPanel, readMetricValue } from '../metric_panel';

// The logstash data lives in 2015, so the default time range (last 15 minutes) has no data.
const HISTORICAL_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
};

spaceTest.describe('Dashboard time picker', { tag: tags.deploymentAgnostic }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.uiSettings.set({ 'dateFormat:tz': 'UTC' });
    dashboardId = await apiServices.dashboard.create(
      {
        title: `Time picker dashboard - ${scoutSpace.id}`,
        panels: [createMetricPanel('logstash-*')],
      },
      scoutSpace.id
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.uiSettings.unset('dateFormat:tz');
  });

  spaceTest('Visualization updated when time picker changes', async ({ page, pageObjects }) => {
    await pageObjects.dashboard.openDashboardWithId(dashboardId);
    await pageObjects.dashboard.waitForPanelsToLoad(1);

    await pageObjects.datePicker.setAbsoluteRange(HISTORICAL_RANGE);
    await pageObjects.dashboard.waitForRenderComplete();

    await expect.poll(() => readMetricValue(page)).toBeGreaterThan(0);
  });

  spaceTest(
    'Timepicker start, end, interval values are set by url',
    async ({ page, pageObjects }) => {
      await page.gotoApp('dashboards', {
        hash:
          '/create?' +
          // Keep refreshInterval at or above query.timefilter.minRefreshInterval (5000ms on serverless)
          '_g=(refreshInterval:(pause:!t,value:10000),' +
          "time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&" +
          "_a=(description:'',filters:!())",
      });
      await pageObjects.dashboard.waitForRenderComplete();

      const time = await pageObjects.datePicker.getTimeConfig();
      const refresh = await pageObjects.datePicker.getRefreshConfig();
      // The date range picker exposes the absolute range as ISO strings
      expect(time.start).toBe('2012-11-17T00:00:00.000Z');
      expect(time.end).toBe('2015-11-17T18:01:36.621Z');
      expect(refresh.interval).toBe('10');
    }
  );

  spaceTest(
    'Timepicker respects dateFormat from UI settings',
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS' });
      try {
        await pageObjects.dashboard.openDashboardWithId(dashboardId);
        await pageObjects.dashboard.waitForPanelsToLoad(1);

        // Same date range as HISTORICAL_RANGE
        await pageObjects.datePicker.setAbsoluteRange({
          from: '2015-09-19 06:31:44.000',
          to: '2015-09-23 18:31:44.000',
        });
        await pageObjects.dashboard.waitForRenderComplete();

        await expect.poll(() => readMetricValue(page)).toBeGreaterThan(0);
      } finally {
        await scoutSpace.uiSettings.unset('dateFormat');
      }
    }
  );
});
