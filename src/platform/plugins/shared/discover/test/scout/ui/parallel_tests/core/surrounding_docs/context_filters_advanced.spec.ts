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

        const fieldsBefore = await pageObjects.discover.getDataGridRows();
        expect(fieldsBefore.every((row) => row[2] === TEST_ANCHOR_FILTER_VALUE)).toBe(true);

        const filterBadge = page.testSubj.locator(
          `~filter & ~filter-key-${TEST_ANCHOR_FILTER_FIELD}`
        );
        await filterBadge.click();
        await page.testSubj.click('pinFilter');

        await filterBadge.click();
        await page.testSubj.click('negateFilter');
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

        const fieldsAfter = await pageObjects.discover.getDataGridRows();
        expect(fieldsAfter.every((row) => row[2] === TEST_ANCHOR_FILTER_VALUE)).toBe(false);
      }
    );

    spaceTest('should add OR filter', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      const filterForm0 = page.locator('[data-test-subj="filter-0"]');
      await filterForm0.locator('[data-test-subj="add-or-filter"]').click();

      await spaceTest.step('fill first condition: extension is png', async () => {
        const form = page.locator('[data-test-subj="filter-0\\.0"]');
        await form.locator('[data-test-subj="filterFieldSuggestionList"] input').fill('extension');
        await page.locator('.euiComboBoxOption[title="extension"]').click();
        await form.locator('[data-test-subj="filterOperatorList"] input').fill('is');
        await page.locator('.euiComboBoxOption[title="is"]').click();
        await form.locator('[data-test-subj="filterParams"] input').fill('png');
      });

      await spaceTest.step('fill second condition: bytes is between', async () => {
        const form = page.locator('[data-test-subj="filter-0\\.1"]');
        await form.locator('[data-test-subj="filterFieldSuggestionList"] input').fill('bytes');
        await page.locator('.euiComboBoxOption[title="bytes"]').click();
        await form.locator('[data-test-subj="filterOperatorList"] input').fill('is between');
        await page.locator('.euiComboBoxOption[title="is between"]').click();
        await form.locator('[data-test-subj="range-start"]').fill('1000');
        await form.locator('[data-test-subj="range-end"]').fill('2000');
      });

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);

      await spaceTest.step('verify filter preview text', async () => {
        const filterBadge = page.testSubj.locator('~filter & ~filter-id-0');
        await filterBadge.click();
        await page.testSubj.click('editFilter');
        const preview = page.testSubj.locator('filter-preview');
        await expect(preview).toContainText('extension: png OR bytes: 1,000B to 2KB');
      });
    });

    spaceTest('should add AND filter', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      const filterForm0 = page.locator('[data-test-subj="filter-0"]');
      await filterForm0.locator('[data-test-subj="add-and-filter"]').click();

      await spaceTest.step('fill first condition: extension is one of png, jpeg', async () => {
        const form = page.locator('[data-test-subj="filter-0\\.0"]');
        await form.locator('[data-test-subj="filterFieldSuggestionList"] input').fill('extension');
        await page.locator('.euiComboBoxOption[title="extension"]').click();
        await form.locator('[data-test-subj="filterOperatorList"] input').fill('is one of');
        await page.locator('.euiComboBoxOption[title="is one of"]').click();
        const filterInput = form.locator('[data-test-subj="filterParams"] input');
        await filterInput.fill('png');
        await filterInput.press('Enter');
        await filterInput.fill('jpeg');
        await filterInput.press('Enter');
      });

      await spaceTest.step('fill second condition: bytes is between', async () => {
        const form = page.locator('[data-test-subj="filter-0\\.1"]');
        await form.locator('[data-test-subj="filterFieldSuggestionList"] input').fill('bytes');
        await page.locator('.euiComboBoxOption[title="bytes"]').click();
        await form.locator('[data-test-subj="filterOperatorList"] input').fill('is between');
        await page.locator('.euiComboBoxOption[title="is between"]').click();
        await form.locator('[data-test-subj="range-start"]').fill('1000');
        await form.locator('[data-test-subj="range-end"]').fill('2000');
      });

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);

      await spaceTest.step('verify filter preview text', async () => {
        const filterBadge = page.testSubj.locator('~filter & ~filter-id-0');
        await filterBadge.click();
        await page.testSubj.click('editFilter');
        const preview = page.testSubj.locator('filter-preview');
        await expect(preview).toContainText(
          'extension: is one of png, jpeg AND bytes: 1,000B to 2KB'
        );
      });
    });

    spaceTest('should add nested filters', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      await spaceTest.step('create AND group at top level', async () => {
        const filterForm0 = page.locator('[data-test-subj="filter-0"]');
        await filterForm0.locator('[data-test-subj="add-and-filter"]').click();
      });

      await spaceTest.step('nest OR group inside first AND branch (filter-0.0)', async () => {
        const form00 = page.locator('[data-test-subj="filter-0\\.0"]');
        await form00.locator('[data-test-subj="add-or-filter"]').click();

        const form000 = page.locator('[data-test-subj="filter-0\\.0\\.0"]');
        await form000
          .locator('[data-test-subj="filterFieldSuggestionList"] input')
          .fill('clientip');
        await page.locator('.euiComboBoxOption[title="clientip"]').click();
        await form000.locator('[data-test-subj="filterOperatorList"] input').fill('does not exist');
        await page.locator('.euiComboBoxOption[title="does not exist"]').click();

        const form001 = page.locator('[data-test-subj="filter-0\\.0\\.1"]');
        await form001
          .locator('[data-test-subj="filterFieldSuggestionList"] input')
          .fill('extension');
        await page.locator('.euiComboBoxOption[title="extension"]').click();
        await form001.locator('[data-test-subj="filterOperatorList"] input').fill('is one of');
        await page.locator('.euiComboBoxOption[title="is one of"]').click();
        const filterInput = form001.locator('[data-test-subj="filterParams"] input');
        await filterInput.fill('png');
        await filterInput.press('Enter');
        await filterInput.fill('jpeg');
        await filterInput.press('Enter');
      });

      await spaceTest.step('fill second AND branch (filter-0.1): bytes is between', async () => {
        const form01 = page.locator('[data-test-subj="filter-0\\.1"]');
        await form01.locator('[data-test-subj="filterFieldSuggestionList"] input').fill('bytes');
        await page.locator('.euiComboBoxOption[title="bytes"]').click();
        await form01.locator('[data-test-subj="filterOperatorList"] input').fill('is between');
        await page.locator('.euiComboBoxOption[title="is between"]').click();
        await form01.locator('[data-test-subj="range-start"]').fill('1000');
        await form01.locator('[data-test-subj="range-end"]').fill('2000');
      });

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);

      await spaceTest.step('verify filter preview text', async () => {
        const filterBadge = page.testSubj.locator('~filter & ~filter-id-0');
        await filterBadge.click();
        await page.testSubj.click('editFilter');
        const preview = page.testSubj.locator('filter-preview');
        await expect(preview).toContainText(
          '(NOT clientip: exists OR extension: is one of png, jpeg) AND bytes: 1,000B to 2KB'
        );
      });
    });

    spaceTest('should display negated values correctly', async ({ page, pageObjects }) => {
      await pageObjects.filterBar.addFilter({
        field: 'extension',
        operator: 'is not',
        value: 'png',
      });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterLabel = page.testSubj.locator('^filter-badge').getByText('NOT extension: png');
      await expect(filterLabel).toBeVisible();

      await spaceTest.step('edit filter to add AND condition', async () => {
        const filterBadge = page.testSubj.locator('~filter & ~filter-id-0');
        await filterBadge.click();
        await page.testSubj.click('editFilter');

        const filterForm0 = page.locator('[data-test-subj="filter-0"]');
        await filterForm0.waitFor({ state: 'visible', timeout: 10_000 });
        await filterForm0.locator('[data-test-subj="add-and-filter"]').click();

        const form01 = page.locator('[data-test-subj="filter-0\\.1"]');
        await form01
          .locator('[data-test-subj="filterFieldSuggestionList"] input')
          .fill('extension');
        await page.locator('.euiComboBoxOption[title="extension"]').click();
        await form01.locator('[data-test-subj="filterOperatorList"] input').fill('is');
        await page.locator('.euiComboBoxOption[title="is"]').click();
        await form01.locator('[data-test-subj="filterParams"] input').fill('jpeg');

        await page.testSubj.click('saveFilter');
        await page.testSubj.waitForSelector('saveFilter', { state: 'hidden' });
        await pageObjects.contextPage.waitUntilContextLoadingHasFinished();
      });

      const updatedLabel = page.testSubj
        .locator('^filter-badge')
        .getByText('NOT extension: png AND extension: jpeg');
      await expect(updatedLabel).toBeVisible();
    });

    spaceTest('should add comma delimiter values for is one of', async ({ page, pageObjects }) => {
      await page.testSubj.click('addFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'visible' });

      await page.testSubj.locator('filterFieldSuggestionList').locator('input').fill('extension');
      await page.locator('.euiComboBoxOption[title="extension"]').click();
      await page.testSubj.locator('filterOperatorList').locator('input').fill('is one of');
      await page.locator('.euiComboBoxOption[title="is one of"]').click();

      const filterInput = page.locator('[data-test-subj="filterParams"] input');
      await filterInput.fill('png, jpeg');
      await filterInput.press('Enter');

      await page.testSubj.click('saveFilter');
      await page.testSubj.waitForSelector('addFilterPopover', { state: 'hidden' });
      await pageObjects.contextPage.waitUntilContextLoadingHasFinished();

      const filterBadges = page.testSubj.locator('^filter-badge');
      await expect(filterBadges).toHaveCount(1);

      await spaceTest.step('verify filter preview text', async () => {
        const filterBadge = page.testSubj.locator('~filter & ~filter-id-0');
        await filterBadge.click();
        await page.testSubj.click('editFilter');
        const preview = page.testSubj.locator('filter-preview');
        await expect(preview).toContainText('extension: is one of png, jpeg');
      });
    });
  }
);
