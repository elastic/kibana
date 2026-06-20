/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, ScoutTestFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../fixtures/common';

const PAGE_SIZE = 5;

const EXPECTED_SELECTED_ROWS_JSON_PREFIX =
  '[{"_index":"logstash-2015.09.22","_id":"AU_x3-TcGFA8no6Qjipx","_version":1,"_score":null,"fields":{';
const EXPECTED_SELECTED_ROWS_MARKDOWN_PREFIX =
  '| @timestamp | @message | @message.raw | @tags | @tags.raw | _i';
const EXPECTED_SELECTED_ROWS_TEXT_PREFIX =
  '"\'@timestamp"\t"\'@message"\t"\'@message.raw"\t"\'@tags"\t"\'@tags.raw"\t"_id"';
const EXPECTED_SELECTED_COLUMNS_MARKDOWN =
  '| @timestamp | extension | bytes |\n| --- | --- | --- |\n| Sep 22, 2015 @ 23:50:13.253 | jpg | 7,124 |\n| Sep 22, 2015 @ 23:43:58.175 | jpg | 5,453 |';
const EXPECTED_SELECTED_COLUMNS_TEXT =
  '"\'@timestamp"\textension\tbytes\n"Sep 22, 2015 @ 23:50:13.253"\tjpg\t"7,124"\n"Sep 22, 2015 @ 23:43:58.175"\tjpg\t"5,453"';

const tryReadClipboard = async (page: ScoutPage): Promise<string | null> => {
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    return await page.evaluate(() => navigator.clipboard.readText());
  } catch {
    return null;
  }
};

const copySelectedRowsAsText = async ({
  actionTestSubj,
  page,
  pageObjects,
}: {
  actionTestSubj: string;
  page: ScoutPage;
  pageObjects: ScoutTestFixtures['pageObjects'];
}): Promise<string | null> => {
  const { discover } = pageObjects;

  await discover.selectRow(2);
  await discover.selectRow(1);

  await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
  await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(2);
  await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(2);

  await discover.openSelectedRowsMenu();
  await discover.clickSelectedRowsMenuAction(actionTestSubj);

  return await tryReadClipboard(page);
};

const copyVisibleColumnsForSelectedRowsAsText = async ({
  actionTestSubj,
  page,
  pageObjects,
}: {
  actionTestSubj: string;
  page: ScoutPage;
  pageObjects: ScoutTestFixtures['pageObjects'];
}): Promise<string | null> => {
  const { discover } = pageObjects;

  await discover.addFieldFromSidebar('extension');
  await discover.addFieldFromSidebar('bytes');

  await expect
    .poll(() => discover.getDataGridHeaderFields())
    .toStrictEqual(['@timestamp', 'extension', 'bytes']);

  await discover.selectRow(1);
  await discover.selectRow(0);

  await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
  await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(2);
  await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(2);

  await discover.openSelectedRowsMenu();
  await discover.clickSelectedRowsMenuAction(actionTestSubj);

  return await tryReadClipboard(page);
};

spaceTest.describe(
  'Discover data grid row selection clipboard actions',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await scoutSpace.uiSettings.set({ 'discover:sampleRowsPerPage': PAGE_SIZE });
    });

    spaceTest.beforeEach(async ({ page, browserAuth, pageObjects }) => {
      await page.setViewportSize({ width: 1600, height: 1200 });
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
        'discover:sampleRowsPerPage'
      );
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('copies selected rows as JSON', async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.selectRow(2);
      await discover.selectRow(1);

      await expect.poll(() => discover.isSelectedRowsMenuVisible()).toBe(true);
      await expect.poll(() => discover.getNumberOfSelectedRowsOnCurrentPage()).toBe(2);
      await expect.poll(() => discover.getNumberOfSelectedRows()).toBe(2);

      await discover.openSelectedRowsMenu();
      await discover.clickSelectedRowsMenuAction('dscGridCopySelectedDocumentsJSON');

      const clipboardData = await tryReadClipboard(page);
      expect(
        clipboardData === null || clipboardData.startsWith(EXPECTED_SELECTED_ROWS_JSON_PREFIX),
        `copied selected rows JSON "${clipboardData}" should start with the expected row data`
      ).toBe(true);
    });

    spaceTest('copies selected rows as tabular text', async ({ page, pageObjects }) => {
      const clipboardData = await copySelectedRowsAsText({
        actionTestSubj: 'unifiedDataTableCopyRowsAsText',
        page,
        pageObjects,
      });

      expect(
        clipboardData === null || clipboardData.startsWith(EXPECTED_SELECTED_ROWS_TEXT_PREFIX),
        `copied selected rows tabular text "${clipboardData}" should start with the expected data`
      ).toBe(true);
    });

    spaceTest('copies selected rows as Markdown text', async ({ page, pageObjects }) => {
      const clipboardData = await copySelectedRowsAsText({
        actionTestSubj: 'unifiedDataTableCopyRowsAsMarkdown',
        page,
        pageObjects,
      });

      expect(
        clipboardData === null || clipboardData.startsWith(EXPECTED_SELECTED_ROWS_MARKDOWN_PREFIX),
        `copied selected rows Markdown text "${clipboardData}" should start with the expected data`
      ).toBe(true);
    });

    spaceTest(
      'copies visible columns for selected rows as tabular text',
      async ({ page, pageObjects }) => {
        const clipboardData = await copyVisibleColumnsForSelectedRowsAsText({
          actionTestSubj: 'unifiedDataTableCopyRowsAsText',
          page,
          pageObjects,
        });

        expect(
          clipboardData === null || clipboardData === EXPECTED_SELECTED_COLUMNS_TEXT,
          `copied selected columns tabular text "${clipboardData}" should equal the expected data`
        ).toBe(true);
      }
    );

    spaceTest(
      'copies visible columns for selected rows as Markdown text',
      async ({ page, pageObjects }) => {
        const clipboardData = await copyVisibleColumnsForSelectedRowsAsText({
          actionTestSubj: 'unifiedDataTableCopyRowsAsMarkdown',
          page,
          pageObjects,
        });

        expect(
          clipboardData === null || clipboardData === EXPECTED_SELECTED_COLUMNS_MARKDOWN,
          `copied selected columns Markdown text "${clipboardData}" should equal the expected data`
        ).toBe(true);
      }
    );
  }
);
