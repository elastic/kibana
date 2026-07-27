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
  start: '2015-09-20T00:00:00.000Z',
  end: '2015-09-22T00:00:00.000Z',
};
const SECOND_TAB_TIME = {
  start: '2015-09-20T06:00:00.000Z',
  end: '2015-09-22T06:00:00.000Z',
};
const THIRD_TAB_TIME = {
  start: '2015-09-20T12:00:00.000Z',
  end: '2015-09-22T12:00:00.000Z',
};
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

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
          expect(await discover.getHitCount()).toBe('14,004');
        });

        await spaceTest.step('save an additional tab as a new session', async () => {
          await unifiedTabs.createNewTab();
          await discover.waitUntilTabIsLoaded();
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);

          await discover.saveSearchAsNew(updatedSessionName);

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });

        await spaceTest.step('keep the legacy session single-tab', async () => {
          await discover.loadSavedSearch(testData.SAVED_SEARCH_TITLE);

          expect(await discover.getCurrentQueryName()).toBe(testData.SAVED_SEARCH_TITLE);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled']);
        });

        await spaceTest.step('load the new multi-tab session', async () => {
          await discover.loadSavedSearch(updatedSessionName);

          expect(await discover.getCurrentQueryName()).toBe(updatedSessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
        });
      }
    );

    spaceTest(
      'saves and reloads data view and ESQL tabs',
      async ({ discoverScoutSpace, pageObjects }) => {
        const { datePicker, discover, lens, queryBar, unifiedFieldList, unifiedTabs } = pageObjects;
        const sessionName = `Multi tab Discover session ${Date.now()}`;

        await spaceTest.step('create saved session through the fixture', async () => {
          await discoverScoutSpace.createDiscoverSession({
            title: sessionName,
            tabs: [
              {
                id: 'persisted-data-view',
                label: FIRST_TAB_LABEL,
                data_source: {
                  type: 'data_view_reference',
                  ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
                },
                query: {
                  language: 'kql',
                  expression: FIRST_TAB_QUERY,
                },
                column_order: ['referer'],
                chart_interval: FIRST_TAB_CHART_INTERVAL_VALUE,
                time_restore: true,
                time_range: {
                  from: FIRST_TAB_TIME.start,
                  to: FIRST_TAB_TIME.end,
                },
              },
              {
                id: 'ad-hoc-data-view',
                label: SECOND_TAB_LABEL,
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: 'logs*',
                  time_field: '@timestamp',
                },
                query: {
                  language: 'kql',
                  expression: SECOND_TAB_QUERY,
                },
                column_order: ['geo.src'],
                time_restore: true,
                time_range: {
                  from: SECOND_TAB_TIME.start,
                  to: SECOND_TAB_TIME.end,
                },
              },
              {
                id: 'esql',
                label: THIRD_TAB_LABEL,
                data_source: {
                  type: 'esql',
                  query: THIRD_TAB_QUERY,
                },
                time_restore: true,
                time_range: {
                  from: THIRD_TAB_TIME.start,
                  to: THIRD_TAB_TIME.end,
                },
              },
            ],
          });
        });

        await spaceTest.step('load and save the seeded session through the UI', async () => {
          await discover.loadSavedSearch(sessionName);

          expect(await discover.getCurrentQueryName()).toBe(sessionName);
          expect(await unifiedTabs.getTabLabels()).toStrictEqual([
            FIRST_TAB_LABEL,
            SECOND_TAB_LABEL,
            THIRD_TAB_LABEL,
          ]);

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          await discover.openLensEditFlyout();
          await lens.switchToVisualization('line', { search: THIRD_TAB_VIS_SHAPE });
          await expect(discover.getLensEditFlyout()).toHaveText(THIRD_TAB_VIS_SHAPE);
          await lens.applyFlyoutChanges();

          await unifiedTabs.selectTab(0);
          await discover.waitUntilTabIsLoaded();
          await discover.saveSearch(sessionName, { storeTimeRange: true });
          expect(await discover.getCurrentQueryName()).toBe(sessionName);
          await expect(discover.unsavedChangesIndicator()).toBeHidden();
        });

        await spaceTest.step('reload and verify each tab state', async () => {
          await discover.clickNewSearch();
          await discover.loadSavedSearch(sessionName);

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
          expect(await datePicker.getTimeConfig()).toStrictEqual(FIRST_TAB_TIME);

          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await queryBar.getQuery()).toBe(SECOND_TAB_QUERY);
          expect(await discover.getSelectedDataViewName()).toBe('logs*');
          expect(await discover.getHitCount()).toBe('6,045');
          expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
            'geo.src',
          ]);
          expect(await datePicker.getTimeConfig()).toStrictEqual(SECOND_TAB_TIME);

          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getHitCount()).toBe('50');
          expect(await discover.getEsqlQueryValue()).toBe(THIRD_TAB_QUERY);
          await discover.openLensEditFlyout();
          expect(await lens.getChartSwitchType()).toBe(THIRD_TAB_VIS_SHAPE);
          await lens.cancelFlyoutChanges();
          expect(await datePicker.getTimeConfig()).toStrictEqual(THIRD_TAB_TIME);
        });
      }
    );
  }
);
