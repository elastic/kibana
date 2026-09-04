/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe('preserve url', { tag: '@local-stateful-classic' }, () => {
  // Second space ID derived from the worker space to stay unique across parallel workers.
  let anotherSpaceId: string;

  spaceTest.beforeAll(async ({ discoverScoutSpace, scoutSpace, kbnClient, apiServices }) => {
    anotherSpaceId = `${scoutSpace.id}-another`;

    await discoverScoutSpace.setupDiscoverDefaults();

    await apiServices.spaces.delete(anotherSpaceId); // defensive: ignore 404 from prior failed run
    await apiServices.spaces.create({ id: anotherSpaceId, name: 'Another Space' });
    await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE, {
      space: anotherSpaceId,
      createNewCopies: true,
    });

    const dataViewId = await apiServices.dataViews.getIdByTitle('logstash-*', anotherSpaceId);
    await kbnClient.uiSettings.update({ defaultIndex: dataViewId }, { space: anotherSpaceId });
    await kbnClient.uiSettings.update(
      {
        'timepicker:timeDefaults': `{ "from": "${testData.DEFAULT_TIME_RANGE.from}", "to": "${testData.DEFAULT_TIME_RANGE.to}"}`,
      },
      { space: anotherSpaceId }
    );
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace, apiServices }) => {
    await apiServices.spaces.delete(anotherSpaceId);
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('goes back to last opened url', async ({ page, pageObjects }) => {
    await page.gotoApp('discover');
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.discover.saveSearch('A Search');
    // saveSearch closes the modal but the URL update to /view/<id> is async;
    // wait for the page to settle so page.url() captures the saved-search URL.
    await pageObjects.discover.waitUntilTabIsLoaded();
    const savedDiscoverUrl = page.url();

    // Navigate to Dashboards (not Home) — collapsibleNav.clickItem fails from the Home page
    // because the nav toggle's aria-expanded is not 'false' there.
    await pageObjects.collapsibleNav.clickItem('Dashboards');
    await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();

    await pageObjects.collapsibleNav.clickItem('Discover');
    await pageObjects.discover.waitUntilTabIsLoaded();

    // savedDiscoverUrl and the restored URL share the same path but differ in _g serialization:
    // Discover omits empty filters but Dashboard includes filters:!() which carries over via _g.
    // Compare only the path portion (saved-search ID) to avoid that false mismatch.
    expect(page.url().split('?')[0]).toBe(savedDiscoverUrl.split('?')[0]);
    expect(await pageObjects.discover.getCurrentQueryName()).toBe('A Search');
  });

  spaceTest(
    'remembers url after switching spaces',
    async ({ page, pageObjects, kbnUrl, scoutSpace }) => {
      // Save a search in the worker space
      await page.gotoApp('discover');
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.saveSearch('Space Search');
      await expect(page).toHaveURL(/#\/view\//);

      // Switch to another space, save a different search there
      await page.goto(kbnUrl.get(`/s/${anotherSpaceId}/app/discover`));
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.saveSearch('Another Space Search');
      await expect(page).toHaveURL(/#\/view\//);

      // Navigate to worker space Dashboards, then click Discover nav link — restores URL per space
      await page.goto(kbnUrl.get(`/s/${scoutSpace.id}/app/dashboards`));
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();
      expect(await pageObjects.discover.getCurrentQueryName()).toBe('Space Search');

      // Navigate to another space Dashboards, then click Discover nav link — restores that space's URL
      await page.goto(kbnUrl.get(`/s/${anotherSpaceId}/app/dashboards`));
      await expect(page.testSubj.locator('dashboardLandingPage')).toBeVisible();
      await pageObjects.collapsibleNav.clickItem('Discover');
      await pageObjects.discover.waitUntilTabIsLoaded();
      expect(await pageObjects.discover.getCurrentQueryName()).toBe('Another Space Search');
    }
  );
});
