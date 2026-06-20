/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * In-table search interactions, highlighting, navigation, and pagination state.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import {
  BUTTON_NEXT_TEST_SUBJ,
  BUTTON_TEST_SUBJ,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
  INPUT_TEST_SUBJ,
} from '@kbn/data-grid-in-table-search';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

const changeRowsPerPageTo = async (page: ScoutPage, rowsPerPage: number) => {
  const rowsPerPageButton = page.testSubj.locator('tablePaginationPopoverButton');

  await rowsPerPageButton.click();
  await page.testSubj.locator(`tablePagination-${rowsPerPage}-rows`).click();

  await expect(rowsPerPageButton).toHaveText(`Rows per page: ${rowsPerPage}`);
};

const currentPageButton = (page: ScoutPage): Locator =>
  page.locator('.euiPaginationButton[aria-current="page"]');

const dataGridCell = (page: ScoutPage, rowIndex: number, columnName: string): Locator =>
  page.locator(
    `[data-grid-visible-row-index="${rowIndex}"] [data-gridcell-column-id="${columnName}"]`
  );

const exitInTableSearch = async (page: ScoutPage) => {
  const input = inTableSearchInput(page);

  if (!(await input.isVisible())) return;

  await input.press('Escape');

  await expect(input).toBeHidden();
  await expect(page.testSubj.locator(BUTTON_TEST_SUBJ)).toBeVisible();
};

const goToNextInTableSearchMatch = async (page: ScoutPage) => {
  const counter = inTableSearchMatchesCounter(page);
  const previousCounter = (await counter.textContent()) ?? '';

  await page.testSubj.locator(BUTTON_NEXT_TEST_SUBJ).click();

  await expect(counter).not.toHaveText(previousCounter);
};

const inTableSearchCellMatches = (page: ScoutPage, rowIndex: number, columnName: string): Locator =>
  dataGridCell(page, rowIndex, columnName).locator(`.${HIGHLIGHT_CLASS_NAME}`);

const inTableSearchInput = (page: ScoutPage): Locator => page.testSubj.locator(INPUT_TEST_SUBJ);

const inTableSearchMatchesCounter = (page: ScoutPage): Locator =>
  page.testSubj.locator(COUNTER_TEST_SUBJ);

const runInTableSearch = async (page: ScoutPage, searchTerm: string) => {
  const input = inTableSearchInput(page);

  if (!(await input.isVisible())) {
    await page.testSubj.locator(BUTTON_TEST_SUBJ).click();
    await expect(input).toBeVisible();
  }

  const counter = inTableSearchMatchesCounter(page);
  const previousCounter = (await counter.textContent()) ?? '';

  await input.fill(searchTerm);
  await expect(counter).not.toHaveText(previousCounter);
};

spaceTest.describe('Discover data grid in-table search', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ page, browserAuth, pageObjects }) => {
    // A tall viewport renders enough rows for per-cell highlight counts and the
    // exact pagination transitions the assertions below rely on.
    await page.setViewportSize({ width: 1200, height: 2000 });
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.dataGrid.waitUntilSearchingHasFinished();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('shows highlights for in-table search', async ({ page }) => {
    await expect(currentPageButton(page)).toHaveText('1');

    await runInTableSearch(page, 'Sep 22, 2015 @ 18:16:13.025');
    await expect(inTableSearchMatchesCounter(page)).toHaveText('1/3');
    await expect(inTableSearchCellMatches(page, 1, '@timestamp')).toHaveCount(1);
    await expect(inTableSearchCellMatches(page, 1, '_source')).toHaveCount(2);
    await expect(inTableSearchCellMatches(page, 2, '@timestamp')).toHaveCount(0);
    await expect(inTableSearchCellMatches(page, 2, '_source')).toHaveCount(0);
    await expect(currentPageButton(page)).toHaveText('3');

    await runInTableSearch(page, 'http');
    await expect(inTableSearchMatchesCounter(page)).toHaveText('1/6386');
    await expect(inTableSearchCellMatches(page, 0, '@timestamp')).toHaveCount(0);
    await expect(inTableSearchCellMatches(page, 0, '_source')).toHaveCount(13);
    await expect(currentPageButton(page)).toHaveText('1');

    await exitInTableSearch(page);
    await expect(inTableSearchCellMatches(page, 0, '@timestamp')).toHaveCount(0);
  });

  spaceTest('uses different colors for highlights in the table', async ({ page, pageObjects }) => {
    const { dataGrid, discover } = pageObjects;
    await discover.writeAndSubmitEsqlQuery('from logstash-* | sort @timestamp | limit 10');
    await dataGrid.waitForDocTableRendered();

    await runInTableSearch(page, '2015 @');
    await expect(inTableSearchMatchesCounter(page)).toHaveText('1/30');
    await expect(inTableSearchCellMatches(page, 0, '@timestamp')).toHaveCount(1);
    await expect(inTableSearchCellMatches(page, 0, '_source')).toHaveCount(2);

    // The active match (first overall, in row 0) must render in a different
    // color than a non-active match (row 1).
    const activeMatchColor = await inTableSearchCellMatches(page, 0, '@timestamp').evaluateAll(
      (els) => window.getComputedStyle(els[0] as Element).backgroundColor
    );
    const otherMatchColor = await inTableSearchCellMatches(page, 1, '@timestamp').evaluateAll(
      (els) => window.getComputedStyle(els[0] as Element).backgroundColor
    );

    expect(activeMatchColor).toContain('rgb');
    expect(otherMatchColor).toContain('rgb');
    expect(activeMatchColor).not.toBe(otherMatchColor);
  });

  spaceTest('can navigate between matches', async ({ page, pageObjects }) => {
    const { dataGrid, discover } = pageObjects;
    await changeRowsPerPageTo(page, 10);
    await dataGrid.addFieldFromSidebar('extension');
    await dataGrid.waitUntilSearchingHasFinished();
    await discover.writeAndSubmitKqlQuery('response : 404 and @tags.raw : "info" and bytes < 1000');

    await runInTableSearch(page, 'php');
    await expect(inTableSearchMatchesCounter(page)).toHaveText('1/4');
    await expect(currentPageButton(page)).toHaveText('1');

    await goToNextInTableSearchMatch(page);
    await expect(inTableSearchMatchesCounter(page)).toHaveText('2/4');
    await expect(currentPageButton(page)).toHaveText('1');

    await goToNextInTableSearchMatch(page);
    await expect(inTableSearchMatchesCounter(page)).toHaveText('3/4');
    await expect(currentPageButton(page)).toHaveText('2');

    await goToNextInTableSearchMatch(page);
    await expect(inTableSearchMatchesCounter(page)).toHaveText('4/4');
    await expect(currentPageButton(page)).toHaveText('3');

    await goToNextInTableSearchMatch(page);
    await expect(inTableSearchMatchesCounter(page)).toHaveText('1/4');
    await expect(currentPageButton(page)).toHaveText('1');
  });

  spaceTest('overrides cmd+f if a grid element was in focus', async ({ page }) => {
    await dataGridCell(page, 0, '@timestamp').click();

    await page.keyboard.press('ControlOrMeta+f');
    await expect(inTableSearchInput(page)).toBeVisible();
  });
});
