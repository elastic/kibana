/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';

const EMPTY_SORT_SNAPSHOT_URL =
  '/app/discover?_t=1453775307251#/' +
  "?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2015-09-19T06:31:44.000Z',to:'2015-09-23T18:31:44.000Z'))" +
  "&_a=(columns:!(),filters:!(),interval:auto,query:(language:kuery,query:''),sort:!())";
const DEFAULT_SORT_URL_STATE = /sort:!\(!\((?:%27|')@timestamp(?:%27|'),desc\)\)/;
const EXPECTED_FIRST_ROW_TIMESTAMP = 'Sep 22, 2015 @ 23:50:13.253';

const getUrlInCurrentSpace = (baseUrl: string, appUrl: string) => {
  const { origin, pathname } = new URL(baseUrl);
  const spacePath = pathname.match(/^(\/s\/[^/]+)?\/app\//)?.[1] ?? '';

  return `${origin}${spacePath}${appUrl}`;
};

spaceTest.describe('Discover shared links', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace, scoutSpace }) => {
    await scoutSpace.uiSettings.unset('state:storeInSessionStorage');
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should allow for copying the snapshot URL with state in query',
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': false });
      await page.reload();
      await pageObjects.discover.waitUntilTabIsLoaded();

      const sharedUrl = await pageObjects.discover.getSharedUrl();

      expect(sharedUrl).toMatch(/\/app\/r.+$/);
    }
  );

  spaceTest(
    'should load snapshot URL with empty sort param correctly',
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': false });

      await page.goto(getUrlInCurrentSpace(page.url(), EMPTY_SORT_SNAPSHOT_URL));
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.discover.selectDataView(testData.DEFAULT_DATA_VIEW);

      await expect(page).toHaveURL(DEFAULT_SORT_URL_STATE);
      await expect(page.locator('[data-grid-row-index="0"]')).toContainText(
        EXPECTED_FIRST_ROW_TIMESTAMP
      );
    }
  );

  spaceTest(
    'should allow for copying the snapshot URL with state in session storage',
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': true });
      await page.reload();
      await pageObjects.discover.waitUntilTabIsLoaded();

      const sharedUrl = await pageObjects.discover.getSharedUrl();
      const actualTime = await pageObjects.datePicker.getTimeConfig();

      await page.evaluate(() => window.sessionStorage.clear());
      await page.goto(sharedUrl);
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(page).toHaveURL(/discover/);
      expect(await pageObjects.datePicker.getTimeConfig()).toStrictEqual(actualTime);
    }
  );

  spaceTest(
    "sharing hashed url shouldn't crash the app",
    async ({ page, pageObjects, scoutSpace }) => {
      await scoutSpace.uiSettings.set({ 'state:storeInSessionStorage': true });
      await page.reload();
      await pageObjects.discover.waitUntilTabIsLoaded();

      const currentUrl = page.url();
      await page.evaluate(() => window.sessionStorage.clear());
      await page.goto(currentUrl);
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(page).toHaveURL(/discover/);
    }
  );
});
