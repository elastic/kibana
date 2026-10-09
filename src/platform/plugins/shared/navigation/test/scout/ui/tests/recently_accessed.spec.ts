/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

/**
 * Project-nav hover list: opening dashboards records them, then the Dashboards
 * sidenav item shows them in Recently viewed and each row navigates back.
 */

const SPACE = {
  id: 'nav-recents-space',
  name: 'Nav Recents Space',
  disabledFeatures: [] as string[],
};

test.describe('recently accessed hover list', { tag: tags.stateful.classic }, () => {
  const runId = randomUUID();
  let first: { id: string; title: string };
  let second: { id: string; title: string };
  let long: { id: string; title: string };

  test.beforeAll(async ({ apiServices }) => {
    // Delete first so a leftover space from an interrupted prior run doesn't
    // fail creation with a 409 conflict.
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
    await apiServices.spaces.create(SPACE);
    await apiServices.spaces.setSolutionView({ id: SPACE.id, solution: 'es' });

    const firstTitle = `nav-recents-a-${runId}`;
    const secondTitle = `nav-recents-b-${runId}`;
    first = {
      title: firstTitle,
      id: await apiServices.dashboard.create({ title: firstTitle }, SPACE.id),
    };
    second = {
      title: secondTitle,
      id: await apiServices.dashboard.create({ title: secondTitle }, SPACE.id),
    };

    const longTitle = `[Metrics Kubernetes] Pods CPU and memory usage by namespace ${runId}`;
    long = {
      title: longTitle,
      id: await apiServices.dashboard.create({ title: longTitle }, SPACE.id),
    };
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('home:welcome:show', 'false');
    });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
  });

  test('shows viewed dashboards in the Dashboards hover list and navigates on click', async ({
    browserAuth,
    pageObjects,
    kbnUrl,
    page,
  }) => {
    const expectDashboardLoaded = async (dashboard: { id: string; title: string }) => {
      await expect(page).toHaveURL(new RegExp(dashboard.id));
      await pageObjects.dashboard.waitForRenderComplete();
      await expect(pageObjects.dashboard.getAppTitle()).toHaveText(dashboard.title);
    };

    const visitDashboard = async (dashboard: { id: string; title: string }) => {
      await page.goto(
        kbnUrl.app('dashboards', {
          space: SPACE.id,
          pathOptions: { hash: `/view/${dashboard.id}` },
        })
      );
      await expectDashboardLoaded(dashboard);
    };

    await browserAuth.loginAsViewer();

    await test.step('open dashboards to record recently viewed', async () => {
      await visitDashboard(first);
      await visitDashboard(second);
    });

    await test.step('navigate away', async () => {
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('discover');
      await expect(page).toHaveURL(/\/app\/discover/);
    });

    await test.step('hover Dashboards and open each recent item', async () => {
      await pageObjects.chrome.nav.hoverPrimaryItemById('dashboards');
      const firstItem = pageObjects.chrome.nav.getPopoverItemById(`recentlyViewed:${first.id}`);
      const secondItem = pageObjects.chrome.nav.getPopoverItemById(`recentlyViewed:${second.id}`);
      await expect(firstItem).toBeVisible();
      await expect(secondItem).toBeVisible();

      await firstItem.click();
      await expectDashboardLoaded(first);

      await pageObjects.chrome.nav.hoverPrimaryItemById('dashboards');
      await secondItem.click();
      await expectDashboardLoaded(second);
    });
  });

  test('shows the full long title in a tooltip on hover', async ({
    browserAuth,
    pageObjects,
    kbnUrl,
    page,
  }) => {
    await browserAuth.loginAsViewer();

    await test.step('open the long-titled dashboard to record it', async () => {
      await page.goto(
        kbnUrl.app('dashboards', {
          space: SPACE.id,
          pathOptions: { hash: `/view/${long.id}` },
        })
      );
      await pageObjects.dashboard.waitForRenderComplete();
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('discover');
      await expect(page).toHaveURL(/\/app\/discover/);
    });

    // The tooltip only renders when the label is measured as overflowing in the real layout.
    await test.step('hover the recent item', async () => {
      await pageObjects.chrome.nav.hoverPrimaryItemById('dashboards');
      await pageObjects.chrome.nav.getPopoverItemById(`recentlyViewed:${long.id}`).hover();
      await expect(page.getByRole('tooltip')).toHaveText(long.title);
    });
  });
});
