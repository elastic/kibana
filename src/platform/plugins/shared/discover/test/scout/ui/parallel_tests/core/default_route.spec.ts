/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../fixtures/common';

const FILTERED_URL_DEFAULT_ROUTE =
  "/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:'2015-09-19T06:31:44.000Z',to:'2015-09-23T18:31:44.000Z'))&_a=(columns:!(extension,host),dataSource:(dataViewId:'logstash-*',type:dataView),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,field:extension.raw,index:'logstash-*',key:extension.raw,negate:!f,params:(query:jpg),type:phrase),query:(match_phrase:(extension.raw:jpg)))),hideChart:!f,interval:auto,query:(language:lucene,query:media),sort:!(!('@timestamp',desc)))";
const getSavedSearchDefaultRoute = (savedSearchId: string) =>
  `/app/discover#/view/${savedSearchId}`;

spaceTest.describe('Discover default route', { tag: '@local-stateful-classic' }, () => {
  let savedSearchDefaultRoute: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const imported = await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    const savedSearch = imported.find(
      ({ title, type }) => title === testData.SAVED_SEARCH_TITLE && type === 'search'
    );

    if (!savedSearch) {
      throw new Error(`Unable to find imported saved search "${testData.SAVED_SEARCH_TITLE}"`);
    }

    savedSearchDefaultRoute = getSavedSearchDefaultRoute(savedSearch.id);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  spaceTest.afterEach(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultRoute');
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'can use a saved search as default route',
    async ({ kbnUrl, page, pageObjects, scoutSpace }) => {
      const { discover } = pageObjects;

      await scoutSpace.uiSettings.set({ defaultRoute: savedSearchDefaultRoute });
      await page.goto(kbnUrl.get(`/s/${scoutSpace.id}/`));
      await discover.waitUntilTabIsLoaded();

      expect(page.url()).toContain(`/s/${scoutSpace.id}${savedSearchDefaultRoute}`);
      expect(await discover.getHitCount()).toBe('14,004');
    }
  );

  spaceTest(
    'can use a URL with filters as default route',
    async ({ kbnUrl, page, pageObjects, scoutSpace }) => {
      const { discover, filterBar, queryBar } = pageObjects;

      await scoutSpace.uiSettings.set({ defaultRoute: FILTERED_URL_DEFAULT_ROUTE });
      await page.goto(kbnUrl.get(`/s/${scoutSpace.id}/`));
      await discover.waitUntilTabIsLoaded();

      expect(await filterBar.hasFilter({ field: 'extension.raw', value: 'jpg' })).toBe(true);
      expect(await queryBar.getQuery()).toBe('media');
      expect(await discover.getHitCount()).toBe('9,109');
    }
  );
});
