/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../fixtures';
import { testData } from '../../fixtures/common';

const TIME_DEFAULTS_FOR_SAVED_SEARCH_FILTERS = {
  from: '2015-09-18T19:37:13.000Z',
  to: '2015-09-23T02:30:09.000Z',
};

const INVALID_DATA_VIEW_ID = 'invalid-data-view-id';

const getDiscoverUrlWithDataViewId = (baseUrl: string, dataViewId: string) => {
  const { origin, pathname } = new URL(baseUrl);
  const spacePath = pathname.match(/^(\/s\/[^/]+)?\/app\//)?.[1] ?? '';

  return `${origin}${spacePath}/app/discover#/?_a=(dataSource:(dataViewId:'${dataViewId}',type:dataView))`;
};

const normalizeHashDataViewIdQuotes = (hash: string) =>
  hash.replace(/dataViewId:'([^']+)'/g, 'dataViewId:$1');

spaceTest.describe('Discover URL state', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.discover.selectDataView(testData.DEFAULT_DATA_VIEW);
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'should show a warning and fall back to the default data view when navigating to a URL with an invalid data view ID',
    async ({ page, pageObjects, apiServices, scoutSpace }) => {
      const defaultDataViewId = await apiServices.dataViews.getIdByTitle(
        testData.DEFAULT_DATA_VIEW,
        scoutSpace.id
      );
      const defaultDataViewUrl = getDiscoverUrlWithDataViewId(page.url(), defaultDataViewId);

      // Force a fresh Discover load so there is no current data view in app state.
      await page.goto('about:blank');
      await page.goto(defaultDataViewUrl.replace(defaultDataViewId, INVALID_DATA_VIEW_ID));
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(pageObjects.discover.getSelectedDataView()).toBeVisible();
      await expect(page.testSubj.locator('dscDataViewNotFoundShowDefaultWarning')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`dataViewId:?['"]?${defaultDataViewId}`));
      await expect(page).not.toHaveURL(new RegExp(INVALID_DATA_VIEW_ID));
    }
  );

  spaceTest(
    'should show a warning and fall back to the current data view if the URL is updated to an invalid data view ID',
    async ({ page, pageObjects, apiServices, scoutSpace }) => {
      const defaultDataViewId = await apiServices.dataViews.getIdByTitle(
        testData.DEFAULT_DATA_VIEW,
        scoutSpace.id
      );

      const defaultDataViewUrl = getDiscoverUrlWithDataViewId(page.url(), defaultDataViewId);

      await page.goto(defaultDataViewUrl);
      await pageObjects.discover.waitUntilTabIsLoaded();

      const originalHash = await page.evaluate(() => window.location.hash);
      const invalidHash = new URL(defaultDataViewUrl).hash.replace(
        defaultDataViewId,
        INVALID_DATA_VIEW_ID
      );

      await page.evaluate((newHash) => {
        window.location.hash = newHash;
      }, invalidHash);
      await pageObjects.discover.waitUntilTabIsLoaded();

      await expect(page.testSubj.locator('dscDataViewNotFoundShowSavedWarning')).toBeVisible();
      expect(normalizeHashDataViewIdQuotes(await page.evaluate(() => window.location.hash))).toBe(
        normalizeHashDataViewIdQuotes(originalHash)
      );
    }
  );

  spaceTest(
    'should sync Lens global state to Discover sidebar link and carry over the state when navigating to Discover',
    async ({ page, pageObjects }) => {
      const { collapsibleNav, datePicker, discover, filterBar } = pageObjects;

      await page.gotoApp('lens');
      await datePicker.typeAbsoluteRange({
        from: testData.DEFAULT_TIME_RANGE_DISPLAY.from,
        to: testData.DEFAULT_TIME_RANGE_DISPLAY.to,
      });
      await filterBar.addFilter({
        field: 'extension.raw',
        operator: 'is one of',
        value: ['jpg', 'css'],
      });
      await filterBar.toggleFilterPinned('extension.raw');

      await collapsibleNav.expandNav();
      await page.getByRole('link', { name: 'Discover', exact: true }).click();
      await discover.waitUntilTabIsLoaded();

      expect(
        await filterBar.hasFilter({
          field: 'extension.raw',
          enabled: true,
          pinned: true,
        })
      ).toBe(true);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: testData.DEFAULT_TIME_RANGE.from,
        end: testData.DEFAULT_TIME_RANGE.to,
      });
      expect(await discover.getHitCountInt()).toBeGreaterThan(0);
    }
  );

  spaceTest(
    'should merge custom global filters with saved search filters',
    async ({ browserAuth, page, pageObjects, scoutSpace }) => {
      const { dataGrid, discover, filterBar, unifiedFieldList } = pageObjects;
      const discoverHitCount = page.testSubj.locator('discoverQueryHits');
      const savedSearchTitle = `testFilters ${scoutSpace.id}`;

      await browserAuth.loginAsPrivilegedUser();
      await scoutSpace.uiSettings.setDefaultTime(TIME_DEFAULTS_FOR_SAVED_SEARCH_FILTERS);
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await discover.waitUntilTabIsLoaded();

      await filterBar.addFilter({
        field: 'bytes',
        operator: 'is between',
        value: { from: '1000', to: '2000' },
      });
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('bytes');

      await expect(discoverHitCount).toHaveText('737');

      await discover.saveSearch(savedSearchTitle);
      await discover.waitUntilTabIsLoaded();
      await expect(discoverHitCount).toHaveText('737');

      await page.reload();
      await discover.waitUntilTabIsLoaded();
      await expect(discoverHitCount).toHaveText('737');

      const savedSearchId = page.url().match(/view\/([^?]+)\?/)?.[1];
      expect(savedSearchId).toBeTruthy();

      await page.goto(new URL(`#/view/${savedSearchId}`, page.url()).toString());
      await discover.waitUntilTabIsLoaded();

      await expect(dataGrid.getCell(0, '@timestamp')).toContainText('Sep 22, 2015 @ 20:44:05.521');
      await expect(dataGrid.getCell(0, 'extension')).toContainText('jpg');
      await expect(dataGrid.getCell(0, 'bytes')).toContainText('1,808');
      await expect(discoverHitCount).toHaveText('737');

      await page.goto(
        new URL(
          `#/view/${savedSearchId}` +
            "?_g=(filters:!(('$state':(store:globalState)," +
            "meta:(alias:!n,disabled:!f,field:extension.raw,index:'logstash-*'," +
            'key:extension.raw,negate:!f,params:!(png,css),type:phrases,value:!(png,css)),' +
            'query:(bool:(minimum_should_match:1,should:!((match_phrase:(extension.raw:png)),' +
            "(match_phrase:(extension.raw:css))))))),query:(language:kuery,query:'')," +
            "refreshInterval:(pause:!t,value:60000),time:(from:'2015-09-19T06:31:44.000Z'," +
            "to:'2015-09-23T18:31:44.000Z'))",
          page.url()
        ).toString()
      );
      await discover.waitUntilTabIsLoaded();

      await expect(dataGrid.getCell(0, '@timestamp')).toContainText('Sep 22, 2015 @ 20:41:53.463');
      await expect(dataGrid.getCell(0, 'extension')).toContainText('png');
      await expect(dataGrid.getCell(0, 'bytes')).toContainText('1,969');
      await expect(discoverHitCount).toHaveText('137');
      await expect(discover.unsavedChangesIndicator()).toBeVisible();

      await page.reload();
      await discover.waitUntilTabIsLoaded();

      await expect(dataGrid.getCell(0, '@timestamp')).toContainText('Sep 22, 2015 @ 20:41:53.463');
      await expect(dataGrid.getCell(0, 'extension')).toContainText('png');
      await expect(dataGrid.getCell(0, 'bytes')).toContainText('1,969');
      await expect(discoverHitCount).toHaveText('137');
      await expect(discover.unsavedChangesIndicator()).toBeVisible();
    }
  );
});
