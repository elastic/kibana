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
  'Discover tabs - unsaved local state',
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
      'locally persists unsaved tab state after refresh',
      async ({ discoverScoutSpace, page, pageObjects }) => {
        const { datePicker, discover, lens, queryBar, unifiedFieldList, unifiedTabs } = pageObjects;
        const sessionName = `Unsaved state Discover session ${Date.now()}`;
        const firstTabUnsavedQuery = 'test and extension : png';
        const secondTabUnsavedQuery = 'extension : png';
        const thirdTabUnsavedQuery = 'FROM logstash-* | SORT @timestamp DESC | LIMIT 25';
        const unsavedVisShape = 'Area';

        await spaceTest.step(
          'create and load a multi-tab session through the fixture',
          async () => {
            await discoverScoutSpace.createDiscoverSession({
              title: sessionName,
              tabs: [
                {
                  id: 'persisted-data-view',
                  label: 'Persisted data view',
                  data_source: {
                    type: 'data_view_reference',
                    ref_id: discoverScoutSpace.getDataViewId(testData.DEFAULT_DATA_VIEW),
                  },
                },
                {
                  id: 'ad-hoc-data-view',
                  label: 'Ad hoc data view',
                  data_source: {
                    type: 'data_view_spec',
                    index_pattern: 'logs*',
                    time_field: '@timestamp',
                  },
                },
                {
                  id: 'esql',
                  label: 'ES|QL',
                  data_source: {
                    type: 'esql',
                    query: 'FROM logstash-* | SORT @timestamp DESC | LIMIT 50',
                  },
                },
              ],
            });

            await discover.loadSavedSearch(sessionName);
            expect(await discover.getCurrentQueryName()).toBe(sessionName);
          }
        );

        const unsavedHitCounts = await spaceTest.step(
          'make unsaved changes in each tab',
          async () => {
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();
            await unifiedTabs.hideTabPreview();
            await datePicker.setAbsoluteRange(FIRST_TAB_UNSAVED_TIME.display);
            await discover.writeAndSubmitKqlQuery(firstTabUnsavedQuery);
            await unifiedFieldList.clickFieldListItemAdd('referer');
            const firstTabHitCount = await discover.getHitCount();

            await unifiedTabs.selectTab(1);
            await discover.waitUntilTabIsLoaded();
            await unifiedTabs.hideTabPreview();
            await datePicker.setAbsoluteRange(SECOND_TAB_UNSAVED_TIME.display);
            await discover.writeAndSubmitKqlQuery(secondTabUnsavedQuery);
            await unifiedFieldList.clickFieldListItemAdd('geo.src');
            const secondTabHitCount = await discover.getHitCount();

            await unifiedTabs.selectTab(2);
            await discover.waitUntilTabIsLoaded();
            await unifiedTabs.hideTabPreview();
            await datePicker.setAbsoluteRange(THIRD_TAB_UNSAVED_TIME.display);
            await discover.writeAndSubmitEsqlQuery(thirdTabUnsavedQuery);
            await discover.openLensEditFlyout();
            await lens.switchToVisualization('area', { search: unsavedVisShape });
            await expect(discover.getLensEditFlyout()).toHaveText(unsavedVisShape);
            await lens.applyFlyoutChanges();
            const thirdTabHitCount = await discover.getHitCount();

            await expect(discover.unsavedChangesIndicator()).toBeVisible();
            await unifiedTabs.selectTab(0);
            await discover.waitUntilTabIsLoaded();

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
      }
    );
  }
);
