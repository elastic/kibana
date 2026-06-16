/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '@kbn/scout';
import { testData } from '../../fixtures/common';

const CONTEXT_COLUMN = '@message';
const CONTEXT_FILTERS = [
  { sidebarField: 'extension', filterField: 'extension.raw', value: 'jpg' },
  { sidebarField: 'geo.src', filterField: 'geo.src', value: 'IN' },
] as const;

const firstRowTimestampCell = (page: ScoutPage) =>
  page.locator('[data-grid-visible-row-index="0"] [data-gridcell-column-id="@timestamp"]');

const getColumnTitles = async (page: ScoutPage): Promise<string[]> => {
  const titles = await page.locator('.euiDataGridHeaderCell__content').allInnerTexts();

  return titles.map((title) => title.trim());
};

const normalizeTimestamp = (timestamp: string) => timestamp.replace('↦', '').trim();

spaceTest.describe('Discover data grid - context view', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    await scoutSpace.uiSettings.set({ 'discover:rowHeightOption': 0 });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset(
      'defaultIndex',
      'timepicker:timeDefaults',
      'discover:rowHeightOption'
    );
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'opens the context view with the selected document as anchor',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.addFieldFromSidebar(CONTEXT_COLUMN);

      for (const filter of CONTEXT_FILTERS) {
        await pageObjects.discover.addFilterForFieldValueFromSidebar(
          filter.sidebarField,
          filter.value
        );
      }
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();

      const firstTimestamp = normalizeTimestamp(await firstRowTimestampCell(page).innerText());

      await pageObjects.discover.openSurroundingDocuments(0);
      await expect(page).toHaveURL(/#\/context/);
      await pageObjects.discover.waitForDocTableRendered();

      await expect.poll(() => getColumnTitles(page)).toStrictEqual(['@timestamp', CONTEXT_COLUMN]);
      await expect(page.testSubj.locator('unifiedDataTableToolbar')).toBeVisible();

      for (const filter of CONTEXT_FILTERS) {
        await expect
          .poll(() =>
            pageObjects.filterBar.hasFilter({
              field: filter.filterField,
              value: filter.value,
              enabled: false,
              pinned: false,
              negated: false,
            })
          )
          .toBe(true);
      }

      await pageObjects.discover.openAnchorDocumentDetails();
      await page.testSubj.click('docViewerTab-doc_view_table');
      await expect(page.testSubj.locator('tableDocViewRow-@timestamp-value')).toHaveText(
        firstTimestamp
      );
    }
  );
});
