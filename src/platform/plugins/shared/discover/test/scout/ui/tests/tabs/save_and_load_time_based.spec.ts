/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Time-based saved-search save/load flows.
 *
 * Validates that the "Store time with saved search" toggle appears or hides
 * in the save dialog depending on whether any tab uses a time-based source.
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { createDataViewFromSearchBar } from '../../fixtures/tabs/helpers';

const AD_HOC_WITH_TIME_RANGE = 'log';
const AD_HOC_WITHOUT_TIME_RANGE = 'logs';
const PERSISTED_WITHOUT_TIME_RANGE = 'logstas*';

test.describe('tabs - time based save behavior', { tag: tags.stateful.all }, () => {
  // The setup test creates a persisted data view that subsequent tests depend on.
  // Serial mode makes this ordering dependency explicit.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
    await esArchiver.loadIfNeeded(
      'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
    );
    await esArchiver.loadIfNeeded(testData.INDEX_PATTERN_WITHOUT_TIMEFIELD_ARCHIVE);
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

  // Create the persisted data view without time field once before the tests
  test('setup: create persisted data view without time field', async ({ pageObjects, page }) => {
    await createDataViewFromSearchBar(page, {
      name: 'logstas',
      adHoc: false,
      hasTimeField: false,
    });
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  test('should show time range switch when saving if any tab is time based', async ({
    pageObjects,
    page,
  }) => {
    const { discover } = pageObjects;

    const expectTimeSwitchVisible = async () => {
      await page.testSubj.click('discoverSaveButton');
      await expect(page.testSubj.locator('storeTimeWithSearch')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.testSubj.locator('confirmSaveSavedObjectButton')).toBeHidden();
    };

    await test.step('case A: persisted DV is time-based, others are not', async () => {
      // Tab 2: ad hoc data view without time field
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: AD_HOC_WITHOUT_TIME_RANGE,
        adHoc: true,
        hasTimeField: false,
      });
      await discover.waitUntilSearchingHasFinished();

      // Tab 3: ES|QL non-time-based
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilSearchingHasFinished();

      // Visit the time-based tab and check
      await discover.selectTabByIndex(0);
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();

      // Switch away, refresh so time-based tab is unvisited, then check
      await discover.selectTabByIndex(1);
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();
    });

    await test.step('case B: ad hoc DV is time-based, others are not', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilSearchingHasFinished();

      // Tab 2: ad hoc data view with time field
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: AD_HOC_WITH_TIME_RANGE,
        adHoc: true,
        hasTimeField: true,
      });
      await discover.waitUntilSearchingHasFinished();

      // Tab 3: ES|QL non-time-based
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilSearchingHasFinished();

      // Visit the time-based tab and check
      await discover.selectTabByIndex(1);
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();

      // Switch away, refresh, then check
      await discover.selectTabByIndex(0);
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();
    });

    await test.step('case C: ES|QL tab is time-based, DV tabs are not', async () => {
      await discover.clickNewSearch();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
      await discover.waitUntilSearchingHasFinished();

      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await createDataViewFromSearchBar(page, {
        name: AD_HOC_WITHOUT_TIME_RANGE,
        adHoc: true,
        hasTimeField: false,
      });
      await discover.waitUntilSearchingHasFinished();

      // Tab 3: ES|QL time-based
      await discover.createNewTab();
      await discover.waitUntilSearchingHasFinished();
      await discover.selectTextBaseLang();
      await discover.codeEditor.setCodeEditorValue(
        'FROM logstash-* | SORT @timestamp DESC | LIMIT 10'
      );
      await page.testSubj.click('querySubmitButton');
      await discover.waitUntilSearchingHasFinished();

      // Visit ES|QL time-based tab and check
      await discover.selectTabByIndex(2);
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();

      // Switch away, refresh, then check
      await discover.selectTabByIndex(1);
      await page.reload();
      await discover.waitUntilSearchingHasFinished();
      await expectTimeSwitchVisible();
    });
  });

  test('should not show time range switch when no tab is time based', async ({
    pageObjects,
    page,
  }) => {
    const { discover } = pageObjects;

    const expectTimeSwitchMissing = async () => {
      await page.testSubj.click('discoverSaveButton');
      await expect(page.testSubj.locator('storeTimeWithSearch')).toBeHidden();
      await page.keyboard.press('Escape');
      await expect(page.testSubj.locator('confirmSaveSavedObjectButton')).toBeHidden();
    };

    // Tab 1: persisted data view without time field
    await discover.selectDataView(PERSISTED_WITHOUT_TIME_RANGE);
    await discover.waitUntilSearchingHasFinished();

    // Tab 2: ad hoc data view without time field
    await discover.createNewTab();
    await discover.waitUntilSearchingHasFinished();
    await createDataViewFromSearchBar(page, {
      name: AD_HOC_WITHOUT_TIME_RANGE,
      adHoc: true,
      hasTimeField: false,
    });
    await discover.waitUntilSearchingHasFinished();

    // Tab 3: ES|QL non-time-based
    await discover.createNewTab();
    await discover.waitUntilSearchingHasFinished();
    await discover.selectTextBaseLang();
    await discover.codeEditor.setCodeEditorValue('FROM without-timefield');
    await page.testSubj.click('querySubmitButton');
    await discover.waitUntilSearchingHasFinished();

    await expectTimeSwitchMissing();

    // Refresh, then check again
    await page.reload();
    await discover.waitUntilSearchingHasFinished();
    await expectTimeSwitchMissing();
  });
});
