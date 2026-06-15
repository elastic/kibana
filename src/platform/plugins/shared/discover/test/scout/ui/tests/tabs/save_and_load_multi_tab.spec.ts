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

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import {
  saveSearchExtended,
  createDataViewFromSearchBar,
  selectDataViewMode,
  changeVisShape,
  getCurrentVisTitle,
  addFieldColumn,
  getQueryString,
  submitQuery,
  getSelectedDataViewName,
  getHitCount,
  getSelectedSidebarFields,
} from '../../fixtures/tabs/helpers';

const SESSION_NAME = 'Multi-tab Discover session';

const PERSISTED_TAB = {
  label: 'Persisted data view',
  query: 'test',
  time: { from: 'Sep 20, 2015 @ 00:00:00.000', to: 'Sep 22, 2015 @ 00:00:00.000' },
  timeISO: { start: '2015-09-20T00:00:00.000Z', end: '2015-09-22T00:00:00.000Z' },
  dataView: 'logstash-*',
  column1: 'referer',
  column2: 'bytes',
  hitCount: '9',
  chartIntervalTitle: 'Hour',
  chartIntervalValue: 'h',
};

const AD_HOC_TAB = {
  label: 'Ad hoc data view',
  query: 'extension : jpg',
  time: { from: 'Sep 20, 2015 @ 06:00:00.000', to: 'Sep 22, 2015 @ 06:00:00.000' },
  timeISO: { start: '2015-09-20T06:00:00.000Z', end: '2015-09-22T06:00:00.000Z' },
  dataView: 'logs*',
  column1: 'geo.src',
  column2: 'bytes',
  hitCount: '6,045',
};

const ESQL_TAB = {
  label: 'ES|QL',
  query: 'FROM logstash-* | SORT @timestamp DESC | LIMIT 50',
  time: { from: 'Sep 20, 2015 @ 12:00:00.000', to: 'Sep 22, 2015 @ 12:00:00.000' },
  timeISO: { start: '2015-09-20T12:00:00.000Z', end: '2015-09-22T12:00:00.000Z' },
  visShape: 'Line',
  hitCount: '50',
};

test.describe('tabs - multi-tab Discover sessions', { tag: tags.stateful.all }, () => {
  // Tests in this suite depend on state created by previous tests (e.g. saved session name).
  // Serial mode makes this ordering dependency explicit.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await esArchiver.loadIfNeeded(testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_ARCHIVE);
    await esArchiver.loadIfNeeded(testData.KIBANA_SAMPLE_DATA_FLIGHTS_ARCHIVE);
    await kbnClient.importExport.load(testData.KIBANA_SAMPLE_DATA_FLIGHTS_INDEX_PATTERN_ARCHIVE);
    await kbnClient.uiSettings.update({
      defaultIndex: testData.DEFAULT_DATA_VIEW,
      'timepicker:timeDefaults': JSON.stringify({
        from: testData.DEFAULT_TIME_RANGE.from,
        to: testData.DEFAULT_TIME_RANGE.to,
      }),
    });
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.uiSettings.unset('defaultIndex');
    await kbnClient.uiSettings.unset('timepicker:timeDefaults');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should support saving a multi-tab Discover session', async ({ pageObjects, page }) => {
    const { discover, datePicker } = pageObjects;

    await test.step('configure persisted data view tab', async () => {
      await datePicker.setAbsoluteRange(PERSISTED_TAB.time);
      await pageObjects.queryBar.setQuery(PERSISTED_TAB.query);
      await submitQuery(page);
      await discover.waitUntilSearchingHasFinished();
      await addFieldColumn(page, PERSISTED_TAB.column1);
      await discover.editTabLabel(0, PERSISTED_TAB.label);
      await discover.setChartInterval(PERSISTED_TAB.chartIntervalTitle);
      expect(await getHitCount(page)).toBe(PERSISTED_TAB.hitCount);
    });

    await test.step('configure ad hoc data view tab', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await datePicker.setAbsoluteRange(AD_HOC_TAB.time);
      await createDataViewFromSearchBar(page, {
        name: 'logs',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilSearchingHasFinished();
      await pageObjects.queryBar.setQuery(AD_HOC_TAB.query);
      await submitQuery(page);
      await discover.waitUntilSearchingHasFinished();
      await addFieldColumn(page, AD_HOC_TAB.column1);
      await discover.editTabLabel(1, AD_HOC_TAB.label);
      expect(await getHitCount(page)).toBe(AD_HOC_TAB.hitCount);
    });

    await test.step('configure ES|QL tab', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await datePicker.setAbsoluteRange(ESQL_TAB.time);
      await discover.writeAndSubmitEsqlQuery(ESQL_TAB.query);
      await changeVisShape(page, ESQL_TAB.visShape);
      await discover.editTabLabel(2, ESQL_TAB.label);
      expect(await getHitCount(page)).toBe(ESQL_TAB.hitCount);
    });

    await test.step('refresh and validate tab labels', async () => {
      await discover.selectTabByIndex(0);
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getTabLabels()).toStrictEqual([
        PERSISTED_TAB.label,
        AD_HOC_TAB.label,
        ESQL_TAB.label,
      ]);
    });

    await test.step('validate persisted tab after refresh', async () => {
      expect(await getHitCount(page)).toBe(PERSISTED_TAB.hitCount);
      expect(await getQueryString(page)).toBe(PERSISTED_TAB.query);
      expect(await discover.getChartInterval()).toBe(PERSISTED_TAB.chartIntervalValue);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([PERSISTED_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: PERSISTED_TAB.timeISO.start,
        end: PERSISTED_TAB.timeISO.end,
      });
    });

    await test.step('validate ad hoc tab after refresh', async () => {
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(AD_HOC_TAB.hitCount);
      expect(await getQueryString(page)).toBe(AD_HOC_TAB.query);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([AD_HOC_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(AD_HOC_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: AD_HOC_TAB.timeISO.start,
        end: AD_HOC_TAB.timeISO.end,
      });
    });

    await test.step('validate ES|QL tab after refresh', async () => {
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(ESQL_TAB.hitCount);
      expect(await discover.getEsqlQueryValue()).toBe(ESQL_TAB.query);
      expect(await getCurrentVisTitle(page)).toBe(ESQL_TAB.visShape);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: ESQL_TAB.timeISO.start,
        end: ESQL_TAB.timeISO.end,
      });
    });

    await test.step('save the session with time range', async () => {
      await discover.selectTabByIndex(0);
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getTabLabels()).toStrictEqual([
        PERSISTED_TAB.label,
        AD_HOC_TAB.label,
        ESQL_TAB.label,
      ]);
      expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);
      await saveSearchExtended(page, SESSION_NAME, { storeTimeRange: true });
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(SESSION_NAME);
      await expect(page.testSubj.locator('split-button-notification-indicator')).toBeHidden();
    });

    await test.step('validate persisted tab after save', async () => {
      expect(await getHitCount(page)).toBe(PERSISTED_TAB.hitCount);
      expect(await getQueryString(page)).toBe(PERSISTED_TAB.query);
      expect(await discover.getChartInterval()).toBe(PERSISTED_TAB.chartIntervalValue);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([PERSISTED_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: PERSISTED_TAB.timeISO.start,
        end: PERSISTED_TAB.timeISO.end,
      });
    });

    await test.step('validate ad hoc tab after save', async () => {
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(AD_HOC_TAB.hitCount);
      expect(await getQueryString(page)).toBe(AD_HOC_TAB.query);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([AD_HOC_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(AD_HOC_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: AD_HOC_TAB.timeISO.start,
        end: AD_HOC_TAB.timeISO.end,
      });
    });

    await test.step('validate ES|QL tab after save', async () => {
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(ESQL_TAB.hitCount);
      expect(await discover.getEsqlQueryValue()).toBe(ESQL_TAB.query);
      expect(await getCurrentVisTitle(page)).toBe(ESQL_TAB.visShape);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: ESQL_TAB.timeISO.start,
        end: ESQL_TAB.timeISO.end,
      });
    });
  });

  test('should support loading a multi-tab Discover session', async ({ pageObjects, page }) => {
    const { discover, datePicker } = pageObjects;

    await discover.loadSavedSearch(SESSION_NAME);
    await discover.waitUntilSearchingHasFinished();

    await expect(page.testSubj.locator('breadcrumb last')).toHaveText(SESSION_NAME);
    expect(await discover.getTabLabels()).toStrictEqual([
      PERSISTED_TAB.label,
      AD_HOC_TAB.label,
      ESQL_TAB.label,
    ]);
    await expect(page.testSubj.locator('split-button-notification-indicator')).toBeHidden();

    await test.step('validate persisted tab', async () => {
      expect(await getHitCount(page)).toBe(PERSISTED_TAB.hitCount);
      expect(await getQueryString(page)).toBe(PERSISTED_TAB.query);
      expect(await discover.getChartInterval()).toBe(PERSISTED_TAB.chartIntervalValue);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([PERSISTED_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: PERSISTED_TAB.timeISO.start,
        end: PERSISTED_TAB.timeISO.end,
      });
    });

    await test.step('validate ad hoc tab', async () => {
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(AD_HOC_TAB.hitCount);
      expect(await getQueryString(page)).toBe(AD_HOC_TAB.query);
      expect(await getSelectedSidebarFields(page)).toStrictEqual([AD_HOC_TAB.column1]);
      expect(await getSelectedDataViewName(page)).toBe(AD_HOC_TAB.dataView);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: AD_HOC_TAB.timeISO.start,
        end: AD_HOC_TAB.timeISO.end,
      });
    });

    await test.step('validate ES|QL tab', async () => {
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await getHitCount(page)).toBe(ESQL_TAB.hitCount);
      expect(await discover.getEsqlQueryValue()).toBe(ESQL_TAB.query);
      expect(await getCurrentVisTitle(page)).toBe(ESQL_TAB.visShape);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: ESQL_TAB.timeISO.start,
        end: ESQL_TAB.timeISO.end,
      });
    });
  });

  test('should locally persist unsaved changes to a multi-tab session', async ({
    pageObjects,
    page,
  }) => {
    const { discover, datePicker } = pageObjects;

    await discover.loadSavedSearch(SESSION_NAME);
    await discover.waitUntilSearchingHasFinished();
    expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);

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

    let persistedUnsavedCount: string;
    let adHocUnsavedCount: string;
    let esqlUnsavedCount: string;

    await test.step('make unsaved changes to persisted tab', async () => {
      await datePicker.setAbsoluteRange(persistedUnsaved.time);
      await pageObjects.queryBar.setQuery(persistedUnsaved.query);
      await submitQuery(page);
      await discover.waitUntilSearchingHasFinished();
      await addFieldColumn(page, PERSISTED_TAB.column2);
      persistedUnsavedCount = await getHitCount(page);
    });

    await test.step('make unsaved changes to ad hoc tab', async () => {
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(AD_HOC_TAB.dataView);
      await datePicker.setAbsoluteRange(adHocUnsaved.time);
      await pageObjects.queryBar.setQuery(adHocUnsaved.query);
      await submitQuery(page);
      await discover.waitUntilSearchingHasFinished();
      await addFieldColumn(page, AD_HOC_TAB.column2);
      adHocUnsavedCount = await getHitCount(page);
    });

    await test.step('make unsaved changes to ES|QL tab', async () => {
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      await datePicker.setAbsoluteRange(esqlUnsaved.time);
      await discover.codeEditor.setCodeEditorValue(esqlUnsaved.query);
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilSearchingHasFinished();
      await changeVisShape(page, esqlUnsaved.visShape);
      esqlUnsavedCount = await getHitCount(page);
    });

    await expect(page.testSubj.locator('split-button-notification-indicator')).toBeVisible();

    await test.step('refresh and validate unsaved changes persist', async () => {
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
    });

    await test.step('validate persisted tab unsaved changes', async () => {
      await discover.selectTabByIndex(0);
      await discover.waitUntilSearchingHasFinished();
      expect(await getQueryString(page)).toBe(persistedUnsaved.query);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: persistedUnsaved.timeISO.start,
        end: persistedUnsaved.timeISO.end,
      });
      expect(await getSelectedSidebarFields(page)).toStrictEqual(persistedUnsaved.columns);
      expect(await getSelectedDataViewName(page)).toBe(PERSISTED_TAB.dataView);
      expect(await getHitCount(page)).toBe(persistedUnsavedCount!);
    });

    await test.step('validate ad hoc tab unsaved changes', async () => {
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getQueryString(page)).toBe(adHocUnsaved.query);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: adHocUnsaved.timeISO.start,
        end: adHocUnsaved.timeISO.end,
      });
      expect(await getSelectedSidebarFields(page)).toStrictEqual(adHocUnsaved.columns);
      expect(await getSelectedDataViewName(page)).toBe(AD_HOC_TAB.dataView);
      expect(await getHitCount(page)).toBe(adHocUnsavedCount!);
    });

    await test.step('validate ES|QL tab unsaved changes', async () => {
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlUnsaved.query);
      expect(await datePicker.getTimeConfig()).toStrictEqual({
        start: esqlUnsaved.timeISO.start,
        end: esqlUnsaved.timeISO.end,
      });
      expect(await getCurrentVisTitle(page)).toBe(esqlUnsaved.visShape);
      expect(await getHitCount(page)).toBe(esqlUnsavedCount!);
    });

    await expect(page.testSubj.locator('split-button-notification-indicator')).toBeVisible();
  });

  test('should clear all tabs when starting a new session', async ({ pageObjects, page }) => {
    const { discover } = pageObjects;

    await discover.loadSavedSearch(SESSION_NAME);
    await discover.waitUntilSearchingHasFinished();

    await expect(page.testSubj.locator('breadcrumb last')).toHaveText(SESSION_NAME);
    expect(await discover.getTabLabels()).toStrictEqual([
      PERSISTED_TAB.label,
      AD_HOC_TAB.label,
      ESQL_TAB.label,
    ]);

    await test.step('clear loaded session', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toBeHidden();
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled']);
    });

    await test.step('add a second unsaved tab', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled', 'Untitled 2']);
    });

    await test.step('clear unsaved tabs', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getTabLabels()).toStrictEqual(['Untitled']);
    });
  });

  test('should restore correct data view or ES|QL query for uninitialized tabs', async ({
    pageObjects,
    page,
  }) => {
    const { discover } = pageObjects;
    const uninitializedSessionName = 'Uninitialized tabs session';
    const persistedDataView1 = 'logstash-*';
    const persistedDataView2 = 'kibana_sample_data_flights';
    const adHocDataView1 = 'logst*';
    const adHocDataView2 = 'log*';
    const esqlQuery1 = 'FROM logstash-* | LIMIT 100';
    const esqlQuery2 = 'FROM kibana_sample_data_flights | LIMIT 50';

    // Tab 0: persisted data view (default)
    expect(await getSelectedDataViewName(page)).toBe(persistedDataView1);

    await test.step('create tab 1: ad-hoc data view 1', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: 'logst',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView1);
    });

    await test.step('create tab 2: ES|QL 1', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.writeAndSubmitEsqlQuery(esqlQuery1);
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery1);
    });

    await test.step('create tab 3: persisted data view 2', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await selectDataViewMode(page, { discardModal: true });
      await discover.waitUntilSearchingHasFinished();
      await discover.selectDataView(persistedDataView2);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView2);
    });

    await test.step('create tab 4: ad-hoc data view 2', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: 'log',
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView2);
    });

    await test.step('create tab 5: ES|QL 2', async () => {
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.writeAndSubmitEsqlQuery(esqlQuery2);
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery2);
    });

    await test.step('refresh and validate all tabs', async () => {
      await page.reload();
      await discover.waitUntilSearchingHasFinished();

      // Tab 5 (ES|QL 2) is current after refresh — wait for the editor to load
      await expect
        .poll(async () => discover.getEsqlQueryValue(), { timeout: 30_000 })
        .toBe(esqlQuery2);

      await discover.selectTabByIndex(4);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView2);

      await discover.selectTabByIndex(3);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView2);

      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery1);

      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView1);

      await discover.selectTabByIndex(0);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView1);
    });

    await test.step('save as new session', async () => {
      await saveSearchExtended(page, uninitializedSessionName);
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(uninitializedSessionName);
    });

    await test.step('validate all tabs after save', async () => {
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView1);

      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView1);

      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery1);

      await discover.selectTabByIndex(3);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView2);

      await discover.selectTabByIndex(4);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView2);

      await discover.selectTabByIndex(5);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery2);
    });

    await test.step('clear session and reload from saved', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toBeHidden();

      await discover.loadSavedSearch(uninitializedSessionName);
      await discover.waitUntilSearchingHasFinished();
      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(uninitializedSessionName);
    });

    await test.step('validate all tabs after reload', async () => {
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView1);

      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView1);

      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery1);

      await discover.selectTabByIndex(3);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(persistedDataView2);

      await discover.selectTabByIndex(4);
      await discover.waitUntilSearchingHasFinished();
      expect(await getSelectedDataViewName(page)).toBe(adHocDataView2);

      await discover.selectTabByIndex(5);
      await discover.waitUntilSearchingHasFinished();
      expect(await discover.getEsqlQueryValue()).toBe(esqlQuery2);
    });
  });
});
