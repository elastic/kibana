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
 * Project-nav hover lists: opening dashboards or Discover sessions records
 * them, then the matching sidenav item shows them in Recently viewed and
 * each row navigates back.
 */

const SPACE = {
  id: 'nav-recents-space',
  name: 'Nav Recents Space',
  disabledFeatures: [] as string[],
};

const esqlTab = {
  id: 'main',
  label: 'Main',
  data_source: {
    type: 'esql' as const,
    query: 'FROM logs-* | LIMIT 10',
  },
};

test.describe('recently accessed hover list', { tag: tags.stateful.classic }, () => {
  const runId = randomUUID();
  let firstDashboard: { id: string; title: string };
  let secondDashboard: { id: string; title: string };
  let firstSession: { id: string; title: string };
  let secondSession: { id: string; title: string };

  test.beforeAll(async ({ apiServices }) => {
    // Delete first so a leftover space from an interrupted prior run doesn't
    // fail creation with a 409 conflict.
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
    await apiServices.spaces.create(SPACE);
    await apiServices.spaces.setSolutionView({ id: SPACE.id, solution: 'es' });

    const firstDashboardTitle = `nav-recents-dash-a-${runId}`;
    const secondDashboardTitle = `nav-recents-dash-b-${runId}`;
    firstDashboard = {
      title: firstDashboardTitle,
      id: await apiServices.dashboard.create({ title: firstDashboardTitle }, SPACE.id),
    };
    secondDashboard = {
      title: secondDashboardTitle,
      id: await apiServices.dashboard.create({ title: secondDashboardTitle }, SPACE.id),
    };

    const firstSessionTitle = `nav-recents-discover-a-${runId}`;
    const secondSessionTitle = `nav-recents-discover-b-${runId}`;
    firstSession = {
      title: firstSessionTitle,
      id: await apiServices.discover.create(
        { title: firstSessionTitle, tabs: [esqlTab] },
        SPACE.id
      ),
    };
    secondSession = {
      title: secondSessionTitle,
      id: await apiServices.discover.create(
        { title: secondSessionTitle, tabs: [esqlTab] },
        SPACE.id
      ),
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
      await visitDashboard(firstDashboard);
      await visitDashboard(secondDashboard);
    });

    await test.step('navigate away', async () => {
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('discover');
      await expect(page).toHaveURL(/\/app\/discover/);
    });

    await test.step('hover Dashboards and open each recent item', async () => {
      await pageObjects.chrome.nav.hoverPrimaryItemById('dashboards');
      const firstItem = pageObjects.chrome.nav.getPopoverItemById(
        `recentlyViewed:${firstDashboard.id}`
      );
      const secondItem = pageObjects.chrome.nav.getPopoverItemById(
        `recentlyViewed:${secondDashboard.id}`
      );
      await expect(firstItem).toBeVisible();
      await expect(secondItem).toBeVisible();

      await firstItem.click();
      await expectDashboardLoaded(firstDashboard);

      await pageObjects.chrome.nav.hoverPrimaryItemById('dashboards');
      await secondItem.click();
      await expectDashboardLoaded(secondDashboard);
    });
  });

  test('shows viewed Discover sessions in the Discover hover list and navigates on click', async ({
    browserAuth,
    pageObjects,
    kbnUrl,
    page,
  }) => {
    const expectDiscoverSessionLoaded = async (session: { id: string; title: string }) => {
      await expect(page).toHaveURL(new RegExp(session.id));
      await expect(pageObjects.discover.getCurrentQueryNameLocator()).toHaveText(session.title);
    };

    const visitDiscoverSession = async (session: { id: string; title: string }) => {
      await page.goto(
        kbnUrl.app('discover', {
          space: SPACE.id,
          pathOptions: { hash: `/view/${session.id}` },
        })
      );
      await expectDiscoverSessionLoaded(session);
    };

    await browserAuth.loginAsViewer();

    await test.step('open Discover sessions to record recently viewed', async () => {
      await visitDiscoverSession(firstSession);
      await visitDiscoverSession(secondSession);
    });

    await test.step('navigate away', async () => {
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('dashboards');
      await expect(page).toHaveURL(/\/app\/dashboards/);
    });

    await test.step('hover Discover and open each recent item', async () => {
      await pageObjects.chrome.nav.hoverPrimaryItemById('discover');
      const firstItem = pageObjects.chrome.nav.getPopoverItemById(
        `recentlyViewed:${firstSession.id}`
      );
      const secondItem = pageObjects.chrome.nav.getPopoverItemById(
        `recentlyViewed:${secondSession.id}`
      );
      await expect(firstItem).toBeVisible();
      await expect(secondItem).toBeVisible();

      await firstItem.click();
      await expectDiscoverSessionLoaded(firstSession);

      await pageObjects.chrome.nav.hoverPrimaryItemById('discover');
      await secondItem.click();
      await expectDiscoverSessionLoaded(secondSession);
    });
  });
});
