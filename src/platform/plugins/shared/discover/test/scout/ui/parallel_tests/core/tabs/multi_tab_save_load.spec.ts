/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Multi-tab save/load flows.
 *
 * Validates saving and loading multi-tab Discover sessions with persisted
 * data views, ad-hoc data views, and ES|QL tabs.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../../../fixtures/common';
import {
  AD_HOC_TAB,
  ESQL_TAB,
  PERSISTED_TAB,
} from '../../../fixtures/tabs/discover_session_test_data';
import {
  buildMultiTabSession,
  createMultiTabDiscoverSession,
} from '../../../fixtures/tabs/discover_session_setup';

const SAVED_SESSION_NAME = 'Saved multi-tab Discover session';
const LOADED_SESSION_NAME = 'Loaded multi-tab Discover session';
const UNSAVED_CHANGES_SESSION_NAME = 'Unsaved changes Discover session';

spaceTest.describe('tabs - multi-tab Discover sessions', { tag: '@local-stateful-classic' }, () => {
  // Every test here builds three tabs (persisted, ad-hoc + ad-hoc data-view
  // creation, and ES|QL + Lens vis) and reloads to assert persistence, which
  // does not fit the default 60s
  spaceTest.setTimeout(120_000);

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

  spaceTest('should support saving a multi-tab Discover session', async ({ pageObjects, page }) => {
    const { discover, datePicker, queryBar, unifiedTabs, unifiedFieldList } = pageObjects;

    // Build the three-tab session (persisted, ad-hoc, ES|QL); the resulting
    // state is validated after the reload below and then saved.
    await buildMultiTabSession(pageObjects);

    await spaceTest.step('refresh and validate tab labels', async () => {
      await unifiedTabs.selectTab(0);
      await discover.waitForTabStateToPersist();
      await page.reload();
      await discover.waitUntilTabIsLoaded();
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        PERSISTED_TAB.label,
        AD_HOC_TAB.label,
        ESQL_TAB.label,
      ]);
    });

    await spaceTest.step('validate persisted tab after refresh', async () => {
      expect(await discover.getHitCountInt()).toBe(PERSISTED_TAB.hitCount);
      expect(await queryBar.getQuery()).toBe(PERSISTED_TAB.query);
      expect(await discover.getChartInterval()).toBe(PERSISTED_TAB.chartIntervalValue);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        PERSISTED_TAB.column1,
      ]);
      expect(await discover.getSelectedDataViewName()).toBe(PERSISTED_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: PERSISTED_TAB.timeISO.start,
        end: PERSISTED_TAB.timeISO.end,
      });
    });

    await spaceTest.step('validate ad hoc tab after refresh', async () => {
      await unifiedTabs.selectTab(1);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(AD_HOC_TAB.hitCount);
      expect(await queryBar.getQuery()).toBe(AD_HOC_TAB.query);
      expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
        AD_HOC_TAB.column1,
      ]);
      expect(await discover.getSelectedDataViewName()).toBe(AD_HOC_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: AD_HOC_TAB.timeISO.start,
        end: AD_HOC_TAB.timeISO.end,
      });
    });

    await spaceTest.step('validate ES|QL tab after refresh', async () => {
      await unifiedTabs.selectTab(2);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getHitCountInt()).toBe(ESQL_TAB.hitCount);
      expect(await discover.getEsqlQueryValue()).toBe(ESQL_TAB.query);
      expect(await discover.getHistogramVisShape()).toBe(ESQL_TAB.visShape);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: ESQL_TAB.timeISO.start,
        end: ESQL_TAB.timeISO.end,
      });
    });

    await spaceTest.step('save the session with time range', async () => {
      await discover.saveSearch(SAVED_SESSION_NAME, { storeTimeRange: true });
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(SAVED_SESSION_NAME);
      // Saving clears the unsaved-changes diff; full restoration of the saved
      // session is covered by the "loading" test, so we don't re-validate every
      // tab here.
      await page.testSubj
        .locator('split-button-notification-indicator')
        .waitFor({ state: 'hidden' });
    });
  });

  spaceTest(
    'should support loading a multi-tab Discover session',
    async ({ pageObjects, page }) => {
      const { discover, datePicker, queryBar, unifiedTabs, unifiedFieldList } = pageObjects;

      await createMultiTabDiscoverSession(pageObjects, LOADED_SESSION_NAME);
      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();
      await discover.loadSavedSearch(LOADED_SESSION_NAME);
      await discover.waitUntilTabIsLoaded();

      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(LOADED_SESSION_NAME);
      expect(await unifiedTabs.getTabLabels()).toStrictEqual([
        PERSISTED_TAB.label,
        AD_HOC_TAB.label,
        ESQL_TAB.label,
      ]);
      await page.testSubj
        .locator('split-button-notification-indicator')
        .waitFor({ state: 'hidden' });

      await spaceTest.step('validate persisted tab', async () => {
        expect(await discover.getHitCountInt()).toBe(PERSISTED_TAB.hitCount);
        expect(await queryBar.getQuery()).toBe(PERSISTED_TAB.query);
        expect(await discover.getChartInterval()).toBe(PERSISTED_TAB.chartIntervalValue);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          PERSISTED_TAB.column1,
        ]);
        expect(await discover.getSelectedDataViewName()).toBe(PERSISTED_TAB.dataView);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: PERSISTED_TAB.timeISO.start,
          end: PERSISTED_TAB.timeISO.end,
        });
      });

      await spaceTest.step('validate ad hoc tab', async () => {
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCountInt()).toBe(AD_HOC_TAB.hitCount);
        expect(await queryBar.getQuery()).toBe(AD_HOC_TAB.query);
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual([
          AD_HOC_TAB.column1,
        ]);
        expect(await discover.getSelectedDataViewName()).toBe(AD_HOC_TAB.dataView);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: AD_HOC_TAB.timeISO.start,
          end: AD_HOC_TAB.timeISO.end,
        });
      });

      await spaceTest.step('validate ES|QL tab', async () => {
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getHitCountInt()).toBe(ESQL_TAB.hitCount);
        expect(await discover.getEsqlQueryValue()).toBe(ESQL_TAB.query);
        expect(await discover.getHistogramVisShape()).toBe(ESQL_TAB.visShape);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: ESQL_TAB.timeISO.start,
          end: ESQL_TAB.timeISO.end,
        });
      });
    }
  );

  spaceTest(
    'should locally persist unsaved changes to a multi-tab session',
    async ({ pageObjects, page }) => {
      const { discover, datePicker, queryBar, unifiedTabs, unifiedFieldList } = pageObjects;

      await createMultiTabDiscoverSession(pageObjects, UNSAVED_CHANGES_SESSION_NAME);
      await discover.clickNewSearch();
      await discover.waitUntilTabIsLoaded();
      await discover.loadSavedSearch(UNSAVED_CHANGES_SESSION_NAME);
      await discover.waitUntilTabIsLoaded();
      expect(await discover.getSelectedDataViewName()).toBe(PERSISTED_TAB.dataView);

      const persistedUnsaved = {
        time: { from: 'Sep 20, 2015 @ 01:00:00.000', to: 'Sep 22, 2015 @ 01:00:00.000' },
        timeISO: { start: '2015-09-20T01:00:00.000Z', end: '2015-09-22T01:00:00.000Z' },
        query: 'test and extension : png',
        columns: [PERSISTED_TAB.column1, PERSISTED_TAB.column2],
      };
      const adHocUnsaved = {
        time: { from: 'Sep 20, 2015 @ 07:00:00.000', to: 'Sep 22, 2015 @ 07:00:00.000' },
        timeISO: { start: '2015-09-20T07:00:00.000Z', end: '2015-09-22T07:00:00.000Z' },
        query: 'extension : png',
        columns: [AD_HOC_TAB.column1, AD_HOC_TAB.column2],
      };
      const esqlUnsaved = {
        time: { from: 'Sep 20, 2015 @ 13:00:00.000', to: 'Sep 22, 2015 @ 13:00:00.000' },
        timeISO: { start: '2015-09-20T13:00:00.000Z', end: '2015-09-22T13:00:00.000Z' },
        query: 'FROM logstash-* | SORT @timestamp DESC | LIMIT 25',
        visShape: 'Area',
      };

      // Capture each tab's hit count while the unsaved changes are applied, so we
      // can assert after reload that the restored state actually re-runs the search
      // and yields the same results (not just that the input controls rehydrate).
      const persistedUnsavedCount = await spaceTest.step(
        'make unsaved changes to persisted tab',
        async () => {
          await datePicker.setAbsoluteRange(persistedUnsaved.time);
          await queryBar.setQuery(persistedUnsaved.query);
          await discover.submitQuery();
          await discover.waitUntilTabIsLoaded();
          await unifiedFieldList.clickFieldListItemAdd(PERSISTED_TAB.column2);
          return discover.getHitCountInt();
        }
      );

      const adHocUnsavedCount = await spaceTest.step(
        'make unsaved changes to ad hoc tab',
        async () => {
          await unifiedTabs.selectTab(1);
          await discover.waitUntilTabIsLoaded();
          expect(await discover.getSelectedDataViewName()).toBe(AD_HOC_TAB.dataView);
          await datePicker.setAbsoluteRange(adHocUnsaved.time);
          await queryBar.setQuery(adHocUnsaved.query);
          await discover.submitQuery();
          await discover.waitUntilTabIsLoaded();
          await unifiedFieldList.clickFieldListItemAdd(AD_HOC_TAB.column2);
          return discover.getHitCountInt();
        }
      );

      const esqlUnsavedCount = await spaceTest.step(
        'make unsaved changes to ES|QL tab',
        async () => {
          await unifiedTabs.selectTab(2);
          await discover.waitUntilTabIsLoaded();
          await datePicker.setAbsoluteRange(esqlUnsaved.time);
          await discover.codeEditor.setCodeEditorValue(esqlUnsaved.query);
          await page.testSubj.click('querySubmitButton');
          await discover.waitUntilTabIsLoaded();
          await discover.changeHistogramVisShape(esqlUnsaved.visShape);
          return discover.getHitCountInt();
        }
      );

      await page.testSubj
        .locator('split-button-notification-indicator')
        .waitFor({ state: 'visible' });

      await spaceTest.step('refresh and validate unsaved changes persist', async () => {
        await discover.waitForTabStateToPersist();
        await page.reload();
        await discover.waitUntilTabIsLoaded();
      });

      await spaceTest.step('validate persisted tab unsaved changes', async () => {
        await unifiedTabs.selectTab(0);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(persistedUnsaved.query);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: persistedUnsaved.timeISO.start,
          end: persistedUnsaved.timeISO.end,
        });
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual(
          persistedUnsaved.columns
        );
        expect(await discover.getSelectedDataViewName()).toBe(PERSISTED_TAB.dataView);
        expect(await discover.getHitCountInt()).toBe(persistedUnsavedCount);
      });

      await spaceTest.step('validate ad hoc tab unsaved changes', async () => {
        await unifiedTabs.selectTab(1);
        await discover.waitUntilTabIsLoaded();
        expect(await queryBar.getQuery()).toBe(adHocUnsaved.query);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: adHocUnsaved.timeISO.start,
          end: adHocUnsaved.timeISO.end,
        });
        expect(await unifiedFieldList.getSidebarSectionFieldNames('selected')).toStrictEqual(
          adHocUnsaved.columns
        );
        expect(await discover.getSelectedDataViewName()).toBe(AD_HOC_TAB.dataView);
        expect(await discover.getHitCountInt()).toBe(adHocUnsavedCount);
      });

      await spaceTest.step('validate ES|QL tab unsaved changes', async () => {
        await unifiedTabs.selectTab(2);
        await discover.waitUntilTabIsLoaded();
        expect(await discover.getEsqlQueryValue()).toBe(esqlUnsaved.query);
        expect(await datePicker.getTimeConfig()).toStrictEqual({
          start: esqlUnsaved.timeISO.start,
          end: esqlUnsaved.timeISO.end,
        });
        expect(await discover.getHistogramVisShape()).toBe(esqlUnsaved.visShape);
        expect(await discover.getHitCountInt()).toBe(esqlUnsavedCount);
      });

      await page.testSubj
        .locator('split-button-notification-indicator')
        .waitFor({ state: 'visible' });
    }
  );
});
