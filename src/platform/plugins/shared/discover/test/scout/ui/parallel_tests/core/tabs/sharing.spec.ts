/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DiscoverApp,
  extendPlaywrightPage,
  FilterBar,
  type KibanaUrl,
  QueryBar,
  type ScoutPage,
  UnifiedTabs,
} from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';

const openSharedPage = async (page: ScoutPage, sharedUrl: string, kbnUrl: KibanaUrl) => {
  const sharedPage = extendPlaywrightPage({ page: await page.context().newPage(), kbnUrl });
  const pageObjects = {
    discover: new DiscoverApp(sharedPage),
    filterBar: new FilterBar(sharedPage),
    queryBar: new QueryBar(sharedPage),
    unifiedTabs: new UnifiedTabs(sharedPage),
  };

  await sharedPage.goto(sharedUrl);
  await pageObjects.discover.waitUntilTabIsLoaded();

  return { page: sharedPage, pageObjects };
};

spaceTest.describe('Discover tabs - sharing', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
    await pageObjects.unifiedTabs.clearRecentlyClosedTabs();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest('can share an unsaved tab', async ({ kbnUrl, page, pageObjects }) => {
    const sharedUrl = await spaceTest.step('create share URL for unsaved tab', async () => {
      await pageObjects.unifiedTabs.editTabLabel(0, 'first tab');
      await pageObjects.discover.waitUntilTabIsLoaded();
      expect(await pageObjects.discover.getHitCountInt()).toBe(14_004);

      await pageObjects.unifiedTabs.createNewTab();
      await pageObjects.discover.waitUntilTabIsLoaded();
      await pageObjects.unifiedTabs.editTabLabel(1, 'second tab');
      await pageObjects.discover.writeAndSubmitKqlQuery('bytes > 1000');
      expect(await pageObjects.discover.getHitCountInt()).toBe(12_653);
      expect(await pageObjects.unifiedTabs.getTabLabels()).toStrictEqual([
        'first tab',
        'second tab',
      ]);

      return pageObjects.discover.getSharedUrl();
    });

    await spaceTest.step('open shared URL and modify shared tab', async () => {
      const { page: sharedPage, pageObjects: sharedPageObjects } = await openSharedPage(
        page,
        sharedUrl,
        kbnUrl
      );
      const { discover, queryBar, unifiedTabs } = sharedPageObjects;

      expect(await discover.getHitCount()).toBe('12,653');
      expect(await queryBar.getQuery()).toBe('bytes > 1000');
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['first tab', 'second tab']);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('second tab');

      await unifiedTabs.editTabLabel(1, 'second tab (modified)');
      await discover.writeAndSubmitKqlQuery('bytes > 500');
      expect(await discover.getHitCount()).toBe('13,129');

      await sharedPage.close();
    });

    await page.bringToFront();
    await page.reload();

    await spaceTest.step('verify original page picks up modified tab label', async () => {
      const { discover, queryBar, unifiedTabs } = pageObjects;

      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(12_653);
      expect(await queryBar.getQuery()).toBe('bytes > 1000');
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        'first tab',
        'second tab (modified)',
      ]);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
      expect(await unifiedTabs.getSelectedTabLabel()).toBe('second tab (modified)');
    });

    await page.evaluate(() => window.localStorage.setItem('discover.tabs', ''));

    await spaceTest.step('open shared URL with empty local tab storage', async () => {
      const { page: sharedPage, pageObjects: sharedPageObjects } = await openSharedPage(
        page,
        sharedUrl,
        kbnUrl
      );
      const { discover, queryBar, unifiedTabs } = sharedPageObjects;

      expect(await discover.getHitCount()).toBe('12,653');
      expect(await queryBar.getQuery()).toBe('bytes > 1000');
      expect(await unifiedTabs.getTabLabels()).toStrictEqual(['second tab']);
      expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);

      await sharedPage.close();
    });
  });

  spaceTest(
    'can share one persisted tab from a persisted session',
    async ({ kbnUrl, page, pageObjects }) => {
      const savedSearchName = 'esql';
      const queryEsql = 'FROM logstash-* | LIMIT 20';
      const queryEsqlModified = 'FROM logstash-* | LIMIT 22';

      const sharedUrl = await spaceTest.step(
        'create share URL for persisted ES|QL session',
        async () => {
          await pageObjects.unifiedTabs.editTabLabel(0, 'esql1');
          await pageObjects.discover.selectTextBaseLang();
          await pageObjects.discover.waitUntilTabIsLoaded();

          await pageObjects.unifiedTabs.createNewTab();
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.unifiedTabs.editTabLabel(1, 'esql2');
          await pageObjects.discover.writeAndSubmitEsqlQuery(queryEsql);
          expect(await pageObjects.discover.getHitCountInt()).toBe(20);
          expect(await pageObjects.unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2']);

          await pageObjects.discover.saveSearch(savedSearchName);
          await pageObjects.discover.waitUntilTabIsLoaded();

          return pageObjects.discover.getSharedUrl();
        }
      );

      await spaceTest.step('open shared URL and modify persisted ES|QL tab', async () => {
        const { page: sharedPage, pageObjects: sharedPageObjects } = await openSharedPage(
          page,
          sharedUrl,
          kbnUrl
        );
        const { discover, unifiedTabs } = sharedPageObjects;

        expect(await discover.getHitCount()).toBe('20');
        expect(await discover.getEsqlQueryValue()).toBe(queryEsql);
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('esql2');
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
        expect(await discover.getCurrentQueryName()).toBe(savedSearchName);

        await unifiedTabs.editTabLabel(1, 'esql2 (modified)');
        await discover.writeAndSubmitEsqlQuery(queryEsqlModified);
        expect(await discover.getHitCount()).toBe('22');

        await sharedPage.close();
      });

      await page.bringToFront();
      await page.reload();

      await spaceTest.step('verify original persisted session after shared page edit', async () => {
        const { discover, unifiedTabs } = pageObjects;

        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCountInt()).toBe(20);
        expect(await discover.getEsqlQueryValue()).toBe(queryEsql);
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('esql2 (modified)');
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2 (modified)']);
        expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
        expect(await discover.getCurrentQueryName()).toBe(savedSearchName);
      });

      await page.evaluate(() => window.localStorage.setItem('discover.tabs', ''));

      await spaceTest.step(
        'open persisted ES|QL shared URL with empty local tab storage',
        async () => {
          const { page: sharedPage, pageObjects: sharedPageObjects } = await openSharedPage(
            page,
            sharedUrl,
            kbnUrl
          );
          const { discover, unifiedTabs } = sharedPageObjects;

          expect(await discover.getHitCount()).toBe('20');
          expect(await discover.getEsqlQueryValue()).toBe(queryEsql);
          expect(await unifiedTabs.getSelectedTabLabel()).toBe('esql2');
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['esql1', 'esql2']);
          expect(await unifiedTabs.getRecentlyClosedTabLabels()).toStrictEqual([]);
          expect(await discover.getCurrentQueryName()).toBe(savedSearchName);

          await sharedPage.close();
        }
      );
    }
  );

  spaceTest(
    'can share one unsaved tab from a persisted session',
    async ({ kbnUrl, page, pageObjects }) => {
      const savedSearchName = 'kql';

      const sharedUrl = await spaceTest.step(
        'create share URL for unsaved tab in persisted session',
        async () => {
          await pageObjects.unifiedTabs.editTabLabel(0, 'saved');
          await pageObjects.discover.saveSearch(savedSearchName);
          await pageObjects.discover.waitUntilTabIsLoaded();

          await pageObjects.unifiedTabs.createNewTab();
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.unifiedTabs.editTabLabel(1, 'unsaved');
          await pageObjects.filterBar.addFilter({
            field: 'extension',
            operator: 'is',
            value: 'jpg',
          });
          await pageObjects.discover.waitUntilTabIsLoaded();
          expect(await pageObjects.discover.getHitCountInt()).toBe(9_109);
          expect(await pageObjects.unifiedTabs.getTabLabels()).toStrictEqual(['saved', 'unsaved']);

          const url = await pageObjects.discover.getSharedUrl();
          await pageObjects.discover.closeShareModal();

          await pageObjects.unifiedTabs.selectTab(0);
          await pageObjects.discover.waitUntilTabIsLoaded();
          await pageObjects.discover.clickNewSearch();
          await pageObjects.discover.waitUntilTabIsLoaded();

          return url;
        }
      );

      await spaceTest.step('open shared URL and modify unsaved tab', async () => {
        const { page: sharedPage, pageObjects: sharedPageObjects } = await openSharedPage(
          page,
          sharedUrl,
          kbnUrl
        );
        const { discover, filterBar, unifiedTabs } = sharedPageObjects;

        expect(await discover.getHitCount()).toBe('9,109');
        expect(await filterBar.hasFilter({ field: 'extension', value: 'jpg' })).toBe(true);
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('unsaved');
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['saved', 'unsaved']);
        expect(await unifiedTabs.getRecentlyClosedRootTitles()).toStrictEqual([
          'Untitled',
          '2 tabs',
        ]);
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          'saved',
          'unsaved',
        ]);
        expect(await discover.getCurrentQueryName()).toBe(savedSearchName);
        expect(await discover.isCurrentDataViewAdHoc()).toBe(true);

        await unifiedTabs.editTabLabel(1, 'unsaved (modified)');
        await discover.writeAndSubmitKqlQuery('bytes > 1000');
        expect(await discover.getHitCount()).toBe('8,830');

        await sharedPage.close();
      });

      await page.bringToFront();

      await spaceTest.step('verify persisted session keeps saved tab state', async () => {
        const { discover, filterBar, queryBar, unifiedTabs } = pageObjects;

        await discover.loadSavedSearch(savedSearchName);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getHitCountInt()).toBe(14_004);
        expect(await filterBar.getFilterCount()).toBe(0);
        expect(await queryBar.getQuery()).toBe('');
        expect(await unifiedTabs.getSelectedTabLabel()).toBe('saved');
        expect(await unifiedTabs.getTabLabels()).toStrictEqual(['saved']);
        const recentlyClosedRootTitles = await unifiedTabs.getRecentlyClosedRootTitles();
        expect([...recentlyClosedRootTitles].sort()).toStrictEqual(
          ['unsaved (modified)', 'Untitled', '2 tabs'].sort()
        );
        expect(await unifiedTabs.getRecentlyClosedGroupTabTitles(0)).toStrictEqual([
          'saved',
          'unsaved',
        ]);
        expect(await discover.getCurrentQueryName()).toBe(savedSearchName);
        expect(await discover.isCurrentDataViewAdHoc()).toBe(false);
      });
    }
  );
});
