/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../fixtures';

spaceTest.describe(
  'Discover app - value suggestions: useTimeRange disabled',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME.LOGSTASH);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await scoutSpace.uiSettings.set({ 'autocomplete:useTimeRange': false });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForHistogramRendered();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.uiSettings.set({ 'autocomplete:useTimeRange': true });
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('show up if outside of range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.LOGSTASH_OUT_OF_RANGE_DATES);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        testData.SUGGESTIONS_COUNT_ASSERTION_MESSAGE
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });

    spaceTest('show up if in range', async ({ page, pageObjects }) => {
      await pageObjects.datePicker.setAbsoluteRange(testData.DEFAULT_TIME_RANGE_DISPLAY);
      await page.testSubj.fill('queryInput', 'extension.raw : ');
      await expect(
        page.testSubj.locator('autoCompleteSuggestionText'),
        testData.SUGGESTIONS_COUNT_ASSERTION_MESSAGE
      ).toHaveCount(5);
      const actualSuggestions = await page.testSubj
        .locator('autoCompleteSuggestionText')
        .allTextContents();
      expect(actualSuggestions.join(',')).toContain('jpg');
    });
  }
);
