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
import { tags, test } from '../../../common/ui/fixtures';

/**
 * Project-nav hover list: opening Discover sessions records them, then the
 * Discover sidenav item shows them in Recently viewed and each row navigates back.
 */

const SPACE = {
  id: 'discover-recents-space',
  name: 'Discover Recents Space',
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
  let first: { id: string; title: string };
  let second: { id: string; title: string };

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE.id).catch(() => {});
    await apiServices.spaces.create(SPACE);
    await apiServices.spaces.setSolutionView({ id: SPACE.id, solution: 'es' });

    const firstTitle = `discover-recents-a-${runId}`;
    const secondTitle = `discover-recents-b-${runId}`;
    first = {
      title: firstTitle,
      id: await apiServices.discover.create({ title: firstTitle, tabs: [esqlTab] }, SPACE.id),
    };
    second = {
      title: secondTitle,
      id: await apiServices.discover.create({ title: secondTitle, tabs: [esqlTab] }, SPACE.id),
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
      await visitDiscoverSession(first);
      await visitDiscoverSession(second);
    });

    await test.step('navigate away', async () => {
      await pageObjects.collapsibleNav.clickNavItemByDeepLinkId('dashboards');
      await expect(page).toHaveURL(/\/app\/dashboards/);
    });

    await test.step('hover Discover and open each recent item', async () => {
      await pageObjects.chrome.nav.hoverPrimaryItemById('discover');
      const firstItem = pageObjects.chrome.nav.getPopoverItemById(`recentlyViewed:${first.id}`);
      const secondItem = pageObjects.chrome.nav.getPopoverItemById(`recentlyViewed:${second.id}`);
      await expect(firstItem).toBeVisible();
      await expect(secondItem).toBeVisible();

      await firstItem.click();
      await expectDiscoverSessionLoaded(first);

      await pageObjects.chrome.nav.hoverPrimaryItemById('discover');
      await secondItem.click();
      await expectDiscoverSessionLoaded(second);
    });
  });
});
