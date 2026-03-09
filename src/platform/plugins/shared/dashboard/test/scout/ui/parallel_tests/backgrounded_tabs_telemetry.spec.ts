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
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  SAMPLE_DATA_SET_ID,
  SAMPLE_DATA_DASHBOARD_ID,
  SAMPLE_DATA_VIEW,
  SAMPLE_DATA_RANGE,
} from '../constants';

spaceTest.describe('Dashboard backgrounded tab telemetry', { tag: tags.stateful.classic }, () => {
  spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();

    await apiServices.sampleData.install(SAMPLE_DATA_SET_ID, scoutSpace.id);

    await expect
      .poll(
        async () => {
          const { data: dataViews } = await apiServices.dataViews.find(
            (dataView) => dataView.name === SAMPLE_DATA_VIEW || dataView.title === SAMPLE_DATA_VIEW,
            scoutSpace.id
          );
          return dataViews.length;
        },
        { timeout: 60_000 }
      )
      .toBeGreaterThan(0);

    await scoutSpace.uiSettings.set({
      [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: JSON.stringify(SAMPLE_DATA_RANGE),
    });
  });

  spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
    await apiServices.sampleData.remove(SAMPLE_DATA_SET_ID, scoutSpace.id);
  });

  spaceTest(
    'sets was_hidden_during_load=1 when tab is backgrounded during load',
    async ({ browserAuth, page, pageObjects }) => {
      await spaceTest.step('login and enable telemetry', async () => {
        await browserAuth.loginAsAdmin();
        // Navigate to dashboard first so __analytics_ftr_helpers__ is available
        await pageObjects.dashboard.openDashboardWithId(SAMPLE_DATA_DASHBOARD_ID);
        await pageObjects.dashboard.waitForRenderComplete();
        // @ts-expect-error - __analytics_ftr_helpers__ is injected by the analytics_ftr_helpers plugin
        await page.evaluate(() => window.__analytics_ftr_helpers__.setOptIn(true));
      });

      await spaceTest.step('set up visibility simulation and reload', async () => {
        // Use addInitScript to simulate document.visibilityState being 'hidden' when page loads.
        // This mimics a user switching tabs before the dashboard finishes loading.
        await page.addInitScript(() => {
          let isHidden = true;
          Object.defineProperty(document, 'visibilityState', {
            get: () => (isHidden ? 'hidden' : 'visible'),
            configurable: true,
          });
          // Dispatch visibilitychange event after initial scripts run to trigger the tracking
          setTimeout(() => {
            document.dispatchEvent(new Event('visibilitychange'));
          }, 100);
          // Restore to visible after a delay to allow dashboard to complete loading
          setTimeout(() => {
            isHidden = false;
            document.dispatchEvent(new Event('visibilitychange'));
          }, 2000);
        });

        // Reload to trigger the dashboard load with simulated hidden state
        await page.reload();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify was_hidden_during_load=1 in telemetry event', async () => {
        const events = await page.evaluate(async () => {
          // @ts-expect-error - __analytics_ftr_helpers__ is injected by the analytics_ftr_helpers plugin
          return window.__analytics_ftr_helpers__.getEvents(10, {
            eventTypes: ['performance_metric'],
            filters: { 'properties.eventName': { eq: 'dashboard_loaded' } },
            withTimeoutMs: 10000,
          });
        });

        const dashboardLoadedEvent = events.find(
          (e: { properties: Record<string, unknown> }) =>
            e.properties.key5 === 'was_hidden_during_load'
        );
        expect(dashboardLoadedEvent, 'Expected to find a dashboard_loaded event').toBeTruthy();
        expect(dashboardLoadedEvent!.properties.value5).toBe(1);
      });
    }
  );

  spaceTest(
    'sets was_hidden_during_load=0 when tab stays in foreground',
    async ({ browserAuth, page, pageObjects }) => {
      await spaceTest.step('login and enable telemetry opt-in', async () => {
        await browserAuth.loginAsAdmin();
        await pageObjects.dashboard.openDashboardWithId(SAMPLE_DATA_DASHBOARD_ID);
        await pageObjects.dashboard.waitForRenderComplete();

        // @ts-expect-error - __analytics_ftr_helpers__ is injected by the analytics_ftr_helpers plugin
        await page.evaluate(() => window.__analytics_ftr_helpers__.setOptIn(true));
      });

      await spaceTest.step('reload dashboard in foreground', async () => {
        await page.reload();
        await pageObjects.dashboard.waitForRenderComplete();
      });

      await spaceTest.step('verify was_hidden_during_load=0 in telemetry event', async () => {
        const events = await page.evaluate(async () => {
          // @ts-expect-error - __analytics_ftr_helpers__ is injected by the analytics_ftr_helpers plugin
          return window.__analytics_ftr_helpers__.getEvents(10, {
            eventTypes: ['performance_metric'],
            filters: { 'properties.eventName': { eq: 'dashboard_loaded' } },
            withTimeoutMs: 10000,
          });
        });

        const dashboardLoadedEvent = events.find(
          (e: { properties: Record<string, unknown> }) =>
            e.properties.key5 === 'was_hidden_during_load'
        );
        expect(dashboardLoadedEvent, 'Expected to find a dashboard_loaded event').toBeTruthy();
        expect(dashboardLoadedEvent!.properties.value5).toBe(0);
      });
    }
  );
});
