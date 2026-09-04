/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../common/ui/fixtures';

spaceTest.describe('histogram breakdown', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'applies, filters, and persists a breakdown field',
    async ({ pageObjects, scoutSpace }) => {
      const { discover, filterBar, unifiedFieldList } = pageObjects;
      const savedSearch = `with breakdown ${scoutSpace.id}`;

      await spaceTest.step('apply breakdown from field stats', async () => {
        await unifiedFieldList.clickFieldListAddBreakdownField('geo.dest');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHistogramLegendLabels()).toStrictEqual([
          'CN',
          'IN',
          'US',
          'ID',
          'PK',
          'BR',
          'RU',
          'NG',
          'JP',
          'Other',
        ]);
      });

      await spaceTest.step('choose a different breakdown field', async () => {
        await discover.chooseBreakdownField('extension.raw');
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHistogramLegendLabels()).toStrictEqual([
          'jpg',
          'css',
          'png',
          'gif',
          'php',
        ]);
      });

      await spaceTest.step('add a filter from a legend value', async () => {
        await discover.clickLegendFilter('png', '+');
        await discover.waitUntilTabIsLoaded();
        expect(await filterBar.hasFilter({ field: 'extension.raw', value: 'png' })).toBe(true);
      });

      await spaceTest.step('save and reload the breakdown', async () => {
        await filterBar.removeFilter('extension.raw');
        await discover.saveSearch(savedSearch);
        await discover.clickNewSearch();
        expect(await discover.getHistogramLegendLabels()).toStrictEqual([]);

        await discover.loadSavedSearch(savedSearch);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHistogramLegendLabels()).toStrictEqual([
          'jpg',
          'css',
          'png',
          'gif',
          'php',
        ]);
        expect(await discover.getBreakdownFieldValue()).toBe('Breakdown by extension.raw');
      });
    }
  );

  spaceTest('clears a persisted breakdown field', async ({ pageObjects, scoutSpace }) => {
    const { discover } = pageObjects;
    const savedSearch = `with breakdown and then cleared ${scoutSpace.id}`;

    await discover.chooseBreakdownField('geo.dest');
    await discover.waitUntilTabIsLoaded();
    await discover.saveSearch(savedSearch);

    await discover.clearBreakdownField();
    await discover.waitUntilTabIsLoaded();
    await discover.saveSearch(savedSearch);

    await discover.clickNewSearch();
    await discover.loadSavedSearch(savedSearch);
    await discover.waitUntilTabIsLoaded();
    expect(await discover.getHistogramLegendLabels()).toStrictEqual([]);
    expect(await discover.getBreakdownFieldValue()).toBe('No breakdown');
  });
});
