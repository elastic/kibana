/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/common';

const FIRST_TAB_LABEL = 'Persisted data view';
const SECOND_TAB_LABEL = 'Ad hoc data view';
const THIRD_TAB_LABEL = 'ES|QL';

const FIRST_TAB_QUERY = 'test';
const SECOND_TAB_QUERY = 'extension : jpg';
const THIRD_TAB_QUERY = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 50';

const FIRST_TAB_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 00:00:00.000',
    to: 'Sep 22, 2015 @ 00:00:00.000',
  },
  expected: {
    start: '2015-09-20T00:00:00.000Z',
    end: '2015-09-22T00:00:00.000Z',
  },
};
const SECOND_TAB_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 06:00:00.000',
    to: 'Sep 22, 2015 @ 06:00:00.000',
  },
  expected: {
    start: '2015-09-20T06:00:00.000Z',
    end: '2015-09-22T06:00:00.000Z',
  },
};
const THIRD_TAB_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 12:00:00.000',
    to: 'Sep 22, 2015 @ 12:00:00.000',
  },
  expected: {
    start: '2015-09-20T12:00:00.000Z',
    end: '2015-09-22T12:00:00.000Z',
  },
};
const FIRST_TAB_CHART_INTERVAL_TITLE = 'Hour';
const FIRST_TAB_CHART_INTERVAL_VALUE = 'h';
const THIRD_TAB_VIS_SHAPE = 'Line';

spaceTest.describe(
  'Discover tabs - save and load sessions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilTabIsLoaded();
    });

    spaceTest.afterAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.teardownDiscoverDefaults();
    });

    spaceTest(
      'loads a legacy session and saves extra tabs as a new session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const updatedSessionName = 'Updated legacy session';

        await spaceTest.step('load the legacy session', async () => {
          await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
          expect(await discover.getHitCount()).toBe('14,004');
        });

        await spaceTest.step('save an additional tab as a new session', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.saveSearchAsNew(updatedSessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });

        await spaceTest.step('keep the legacy session single-tab', async () => {
          await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('load the new multi-tab session', async () => {
          await discover.loadSavedSearch(updatedSessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });
      }
    );

    spaceTest('saves and reloads data view and ESQL tabs', async ({ page, pageObjects }) => {
      const { datePicker, discover, lens, queryBar, unifiedFieldList, unifiedTabs } = pageObjects;
      const sessionName = `Multi tab Discover session ${Date.now()}`;
      const changeCurrentVisShape = async (seriesType: string) => {
        await discover.openLensEditFlyout();
        await lens.switchToVisualization(seriesType.toLowerCase(), { search: seriesType });
        await expect(discover.getLensEditFlyout()).toHaveText(seriesType);
        await lens.applyFlyoutChanges();
      };

      await spaceTest.step('create a persisted data view tab', async () => {
        await datePicker.setAbsoluteRange(FIRST_TAB_TIME.display);
        await discover.writeAndSubmitKqlQuery(FIRST_TAB_QUERY);
        await unifiedFieldList.clickFieldListItemAdd('referer');
        await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
        await discover.setChartInterval(FIRST_TAB_CHART_INTERVAL_TITLE);
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('create an ad hoc data view tab', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await datePicker.setAbsoluteRange(SECOND_TAB_TIME.display);
        await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });
        await discover.writeAndSubmitKqlQuery(SECOND_TAB_QUERY);
        await unifiedFieldList.clickFieldListItemAdd('geo.src');
        await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('create an ESQL tab and validate after refresh', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await datePicker.setAbsoluteRange(THIRD_TAB_TIME.display);
        await discover.writeAndSubmitEsqlQuery(THIRD_TAB_QUERY);
        await changeCurrentVisShape(THIRD_TAB_VIS_SHAPE);
        await unifiedTabs.editTabLabel(2, THIRD_TAB_LABEL);

        await unifiedTabs.selectTab(0);
        await page.reload();
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          THIRD_TAB_LABEL,
        ]);
        expect(await queryBar.getQuery()).toBe(FIRST_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);
        expect(await discover.getHitCount()).toBe('9');
        expect(await discover.getChartInterval()).toBe(FIRST_TAB_CHART_INTERVAL_VALUE);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'referer',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(FIRST_TAB_TIME.expected);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(SECOND_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe('logs*');
        expect(await discover.getHitCount()).toBe('6,045');
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'geo.src',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(SECOND_TAB_TIME.expected);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).toBe('50');
        expect(await discover.getEsqlQueryValue()).toBe(THIRD_TAB_QUERY);
        await discover.openLensEditFlyout();
        expect(await lens.getChartSwitchType()).toBe(THIRD_TAB_VIS_SHAPE);
        await lens.cancelFlyoutChanges();
        expect(await datePicker.getTimeConfig()).toStrictEqual(THIRD_TAB_TIME.expected);
      });

      await spaceTest.step('save the refreshed session', async () => {
        await unifiedTabs.selectTab(0);
        await page.reload();
        await discover.waitUntilTabIsLoaded();

        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          THIRD_TAB_LABEL,
        ]);
        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

        await discover.saveSearch(sessionName, { storeTimeRange: true });
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getCurrentQueryName()).toBe(sessionName);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });

      await spaceTest.step('reload and verify each tab state', async () => {
        await discover.clickNewSearch();
        await discover.loadSavedSearch(sessionName);
        await discover.waitUntilTabIsLoaded();

        expect(await discover.getCurrentQueryName()).toBe(sessionName);
        expect(await unifiedTabs.getTabLabels()).toStrictEqual([
          FIRST_TAB_LABEL,
          SECOND_TAB_LABEL,
          THIRD_TAB_LABEL,
        ]);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();

        expect(await queryBar.getQuery()).toBe(FIRST_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);
        expect(await discover.getHitCount()).toBe('9');
        expect(await discover.getChartInterval()).toBe(FIRST_TAB_CHART_INTERVAL_VALUE);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'referer',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(FIRST_TAB_TIME.expected);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(SECOND_TAB_QUERY);
        expect(await discover.getSelectedDataViewName()).toBe('logs*');
        expect(await discover.getHitCount()).toBe('6,045');
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'geo.src',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(SECOND_TAB_TIME.expected);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCount()).toBe('50');
        expect(await discover.getEsqlQueryValue()).toBe(THIRD_TAB_QUERY);
        await discover.openLensEditFlyout();
        expect(await lens.getChartSwitchType()).toBe(THIRD_TAB_VIS_SHAPE);
        await lens.cancelFlyoutChanges();
        expect(await datePicker.getTimeConfig()).toStrictEqual(THIRD_TAB_TIME.expected);
      });
    });
  }
);
