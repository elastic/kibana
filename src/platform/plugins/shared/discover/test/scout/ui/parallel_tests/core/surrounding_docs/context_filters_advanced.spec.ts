/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, testData } from '../../../fixtures/surrounding_docs';

const TEST_ANCHOR_FILTER_FIELD = 'geo.src';
const TEST_ANCHOR_FILTER_VALUE = 'IN';
const TEST_COLUMN_NAMES = ['extension', 'geo.src'];

spaceTest.describe(
  'Discover context - filters (advanced)',
  { tag: testData.CONTEXT_DEPLOYMENT_AGNOSTIC_TAGS },
  () => {
    let dataViewId: string;

    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const imported = await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE_VISUALIZE);
      dataViewId =
        imported.find((so: { title: string }) => so.title === testData.LOGSTASH_DATA_VIEW)?.id ??
        testData.LOGSTASH_DATA_VIEW;
      await scoutSpace.uiSettings.setDefaultIndex(testData.LOGSTASH_DATA_VIEW);
      await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.contextPage.navigateTo(dataViewId, testData.LOGSTASH_ANCHOR_ID, {
        columns: TEST_COLUMN_NAMES,
      });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'discover:rowHeightOption');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should update data grid when a pinned filter is modified',
      async ({ page, pageObjects }) => {
        await pageObjects.filterBar.addFilter({
          field: TEST_ANCHOR_FILTER_FIELD,
          operator: 'is',
          value: TEST_ANCHOR_FILTER_VALUE,
        });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const filterBadge = page.testSubj.locator(
          `~filter & ~filter-key-${TEST_ANCHOR_FILTER_FIELD}`
        );
        await filterBadge.click();
        const pinButton = page.testSubj.locator('pinFilter');
        if (await pinButton.isVisible()) {
          await pinButton.click();
        }

        await filterBadge.click();
        const negateButton = page.testSubj.locator('negateFilter');
        if (await negateButton.isVisible()) {
          await negateButton.click();
        }
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const dataRows = page.locator('[data-test-subj="discoverDocTable"] [data-grid-row-index]');
        const rowTexts = await dataRows.allInnerTexts();
        const allMatchFilter = rowTexts.every((row) => row.includes(TEST_ANCHOR_FILTER_VALUE));
        expect(allMatchFilter).toBe(false);
      }
    );

    spaceTest('should add OR filter', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      const conditionSelector = page.testSubj.locator('filterGroupTypeSelector');
      if (await conditionSelector.isVisible()) {
        await conditionSelector.selectOption('OR');
      }

      await page.testSubj
        .locator('filterFieldSuggestionList >> comboBoxSearchInput')
        .fill('extension');
      await page.locator('.euiComboBoxOption[title="extension"]').click();
      await page.testSubj.locator('filterOperatorList >> comboBoxSearchInput').fill('is');
      await page.locator('.euiComboBoxOption[title="is"]').click();
      const filterInput = page.locator('[data-test-subj="filterParams"] input');
      await filterInput.fill('png');

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);
    });

    spaceTest('should display negated values correctly', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      await page.testSubj.locator('filterFieldSuggestionList').locator('input').fill('extension');
      await page.locator('.euiComboBoxOption[title="extension"]').click();
      await page.testSubj.locator('filterOperatorList').locator('input').fill('is not');
      await page.locator('.euiComboBoxOption[title="is not"]').click();
      const filterInput = page.locator('[data-test-subj="filterParams"] input');
      await filterInput.fill('png');

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterLabel = page.testSubj.locator('^filter-badge').getByText('NOT extension: png');
      await expect(filterLabel).toBeVisible();
    });

    spaceTest('should add comma delimiter values for is one of', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      await page.testSubj.locator('filterFieldSuggestionList').locator('input').fill('extension');
      await page.locator('.euiComboBoxOption[title="extension"]').click();
      await page.testSubj.locator('filterOperatorList').locator('input').fill('is one of');
      await page.locator('.euiComboBoxOption[title="is one of"]').click();

      const filterInput = page.locator('[data-test-subj="filterParams"] input');
      await filterInput.fill('png');
      await filterInput.press('Enter');
      await filterInput.fill('jpeg');
      await filterInput.press('Enter');

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);
    });
  }
);
