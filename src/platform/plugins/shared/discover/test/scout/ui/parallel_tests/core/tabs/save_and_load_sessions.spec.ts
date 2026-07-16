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

const FIRST_TAB_UNSAVED_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 01:00:00.000',
    to: 'Sep 22, 2015 @ 01:00:00.000',
  },
  expected: {
    start: '2015-09-20T01:00:00.000Z',
    end: '2015-09-22T01:00:00.000Z',
  },
};
const SECOND_TAB_UNSAVED_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 07:00:00.000',
    to: 'Sep 22, 2015 @ 07:00:00.000',
  },
  expected: {
    start: '2015-09-20T07:00:00.000Z',
    end: '2015-09-22T07:00:00.000Z',
  },
};
const THIRD_TAB_UNSAVED_TIME = {
  display: {
    from: 'Sep 20, 2015 @ 13:00:00.000',
    to: 'Sep 22, 2015 @ 13:00:00.000',
  },
  expected: {
    start: '2015-09-20T13:00:00.000Z',
    end: '2015-09-22T13:00:00.000Z',
  },
};

spaceTest.describe(
  'Discover tabs - save and load sessions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
      await discoverScoutSpace.setupDiscoverDefaults();
      await discoverScoutSpace.savedObjects.load(
        'src/platform/test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
      );
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

    spaceTest('locally persists unsaved tab state after refresh', async ({ page, pageObjects }) => {
      const { datePicker, discover, lens, queryBar, unifiedFieldList, unifiedTabs } = pageObjects;
      const sessionName = `Unsaved state Discover session ${Date.now()}`;
      const firstTabUnsavedQuery = 'test and extension : png';
      const secondTabUnsavedQuery = 'extension : png';
      const thirdTabUnsavedQuery = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 25';
      const unsavedVisShape = 'Area';
      const changeCurrentVisShape = async (seriesType: string) => {
        await discover.openLensEditFlyout();
        await lens.switchToVisualization(seriesType.toLowerCase(), { search: seriesType });
        await expect(discover.getLensEditFlyout()).toHaveText(seriesType);
        await lens.applyFlyoutChanges();
      };

      await spaceTest.step('create and save a multi-tab session', async () => {
        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.createDataViewFromSearchBar({ name: 'logs', adHoc: true });

        await unifiedTabs.createNewTab();
        await discover.waitUntilTabIsLoaded();
        await discover.writeAndSubmitEsqlQuery(THIRD_TAB_QUERY);

        await discover.saveSearch(sessionName);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getCurrentQueryName()).toBe(sessionName);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });

      const unsavedHitCounts = await spaceTest.step(
        'make unsaved changes in each tab',
        async () => {
          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await datePicker.setAbsoluteRange(FIRST_TAB_UNSAVED_TIME.display);
          await discover.writeAndSubmitKqlQuery(firstTabUnsavedQuery);
          await unifiedFieldList.clickFieldListItemAdd('referer');
          const firstTabHitCount = await discover.getHitCount();

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          await datePicker.setAbsoluteRange(SECOND_TAB_UNSAVED_TIME.display);
          await discover.writeAndSubmitKqlQuery(secondTabUnsavedQuery);
          await unifiedFieldList.clickFieldListItemAdd('geo.src');
          const secondTabHitCount = await discover.getHitCount();

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          await datePicker.setAbsoluteRange(THIRD_TAB_UNSAVED_TIME.display);
          await discover.writeAndSubmitEsqlQuery(thirdTabUnsavedQuery);
          await changeCurrentVisShape(unsavedVisShape);
          const thirdTabHitCount = await discover.getHitCount();

          await expect(discover.unsavedChangesIndicator()).toBeVisible();

          return {
            firstTab: firstTabHitCount,
            secondTab: secondTabHitCount,
            thirdTab: thirdTabHitCount,
          };
        }
      );

      await spaceTest.step('refresh and verify unsaved state in each tab', async () => {
        await page.reload();
        await discover.waitUntilTabIsLoaded();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();

        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(firstTabUnsavedQuery);
        expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);
        expect(await discover.getHitCount()).toBe(unsavedHitCounts.firstTab);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'referer',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(FIRST_TAB_UNSAVED_TIME.expected);

        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(secondTabUnsavedQuery);
        expect(await discover.getSelectedDataViewName()).toBe('logs*');
        expect(await discover.getHitCount()).toBe(unsavedHitCounts.secondTab);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          'geo.src',
        ]);
        expect(await datePicker.getTimeConfig()).toStrictEqual(SECOND_TAB_UNSAVED_TIME.expected);

        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(thirdTabUnsavedQuery);
        expect(await discover.getHitCount()).toBe(unsavedHitCounts.thirdTab);
        await discover.openLensEditFlyout();
        expect(await lens.getChartSwitchType()).toBe(unsavedVisShape);
        await lens.cancelFlyoutChanges();
        expect(await datePicker.getTimeConfig()).toStrictEqual(THIRD_TAB_UNSAVED_TIME.expected);
      });
    });

    spaceTest(
      'clears saved and unsaved tabs when starting a new session',
      async ({ pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Clear tabs Discover session ${Date.now()}`;

        await spaceTest.step('clear a loaded multi-tab session', async () => {
          await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
          await discover.saveSearch(sessionName);
          await discover.waitUntilTabIsLoaded();

          expect(await unifiedTabs.getTabLabels()).toStrictEqual([
            FIRST_TAB_LABEL,
            SECOND_TAB_LABEL,
          ]);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('clear unsaved tabs', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.clickNewSearch();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });
      }
    );

    spaceTest(
      'saves and reloads tabs that were not re-initialized after refresh',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const sessionName = `Uninitialized tabs session ${Date.now()}`;
        const esqlQuery = 'FROM logstash-* | LIMIT 100';

        await spaceTest.step('create data view and ESQL tabs', async () => {
          await unifiedTabs.editTabLabel(0, FIRST_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.createDataViewFromSearchBar({ name: 'logst', adHoc: true });
          await unifiedTabs.editTabLabel(1, SECOND_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe('logst*');

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.writeAndSubmitEsqlQuery(esqlQuery);
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);
        });

        await spaceTest.step('save after refresh without visiting all tabs', async () => {
          await page.reload();
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();

          await discover.saveSearch(sessionName);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getCurrentQueryName()).toBe(sessionName);
        });

        await spaceTest.step('load the session and restore each tab type', async () => {
          await discover.clickNewSearch();
          await discover.loadSavedSearch(sessionName);
          await discover.waitUntilTabIsLoaded();

          await expect(unifiedTabs.getTabs()).toHaveCount(3);

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(FIRST_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe(testData.DEFAULT_DATA_VIEW);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getSelectedTabLabel()).toContain(SECOND_TAB_LABEL);
          expect(await discover.getSelectedDataViewName()).toBe('logst*');

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getEsqlQueryValue()).toBe(esqlQuery);
        });
      }
    );

    spaceTest(
      'shows the store time switch only when at least one tab is time-based after refresh',
      async ({ page, pageObjects }) => {
        const { discover, unifiedTabs } = pageObjects;
        const storeTimeWithSearchSwitch = discover.getStoreTimeWithSearchSwitch();

        await spaceTest.step('show the switch when an unvisited tab is time-based', async () => {
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.selectDataView(testData.DEFAULT_DATA_VIEW);
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();

          await discover.openSaveSearchModal();
          await expect(storeTimeWithSearchSwitch).toBeVisible();
          await discover.closeSaveSearchModal();
        });

        await spaceTest.step('hide the switch when no tabs are time-based', async () => {
          await discover.clickNewSearch();
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          await discover.selectDataView('without-timefield');
          await discover.waitUntilTabIsLoaded();

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await page.reload();
          await discover.waitUntilTabIsLoaded();

          await discover.openSaveSearchModal();
          await expect(storeTimeWithSearchSwitch).toBeHidden();
          await discover.closeSaveSearchModal();
        });
      }
    );
  }
);
