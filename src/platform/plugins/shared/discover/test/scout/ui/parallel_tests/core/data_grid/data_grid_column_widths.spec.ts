/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover data-grid column resizing, reset-width actions, and surrounding-docs widths.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

type DataGridPage = PageObjects['dataGrid'];

// Widths are read via Playwright bounding boxes (sub-pixel floats), while the
// resizer maps ~1:1 to the drag delta. A small tolerance absorbs sub-pixel
// rounding; the assertions distinguish widths that differ by >=100px.
const WIDTH_TOLERANCE_PX = 4;

const expectWidthAbout = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(WIDTH_TOLERANCE_PX);

const openColumnMenuByField = async (page: ScoutPage, field: string) => {
  await expect(async () => {
    await page.testSubj.hover(`dataGridHeaderCell-${field}`);
    await page.testSubj.click(`dataGridHeaderCellActionButton-${field}`);
    await page.testSubj.locator(`dataGridHeaderCellActionGroup-${field}`).waitFor({
      state: 'visible',
    });
  }).toPass();
};

const removeColumn = async (page: ScoutPage, dataGrid: DataGridPage, field: string) => {
  await openColumnMenuByField(page, field);
  await page.getByRole('button', { name: 'Remove column' }).click();
  await expect(dataGrid.getColumnHeader(field)).toBeHidden();
  await dataGrid.waitUntilSearchingHasFinished();
};

const testResizeColumn = async (dataGrid: DataGridPage, field: string) => {
  const { originalWidth, newWidth } = await dataGrid.resizeColumn(field, -100);
  expectWidthAbout(newWidth, originalWidth - 100);

  await dataGrid.resetColumnWidth(field);
  expectWidthAbout(await dataGrid.getColumnWidth(field), originalWidth);
};

spaceTest.describe('Discover data grid column widths', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
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

  spaceTest(
    'does not show the reset-width button for an auto-width column',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;
      await dataGrid.addFieldFromSidebar('@message');
      await dataGrid.waitUntilSearchingHasFinished();

      await openColumnMenuByField(page, '@message');
      await expect(page.testSubj.locator('unifiedDataTableResetColumnWidth')).toBeHidden();
    }
  );

  spaceTest(
    'shows the reset-width button for an absolute-width column and resets to auto',
    async ({ pageObjects }) => {
      const { dataGrid } = pageObjects;
      await dataGrid.addFieldFromSidebar('@message');
      await dataGrid.waitUntilSearchingHasFinished();

      expect(await dataGrid.getColumnWidth('@message')).toBeGreaterThan(0);
      await testResizeColumn(dataGrid, '@message');
    }
  );

  spaceTest(
    'resets the last column to auto width if only absolute-width columns remain',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;
      await dataGrid.addFieldFromSidebar('@message');

      const message = await dataGrid.resizeColumn('@message', -300);
      expect(message.newWidth).toBeLessThan(message.originalWidth);
      expectWidthAbout(message.newWidth, message.originalWidth - 300);

      await dataGrid.addFieldFromSidebar('bytes');
      const bytes = await dataGrid.resizeColumn('bytes', -100);
      expectWidthAbout(bytes.newWidth, bytes.originalWidth - 100);

      expectWidthAbout(await dataGrid.getColumnWidth('@message'), message.newWidth);

      await removeColumn(page, dataGrid, 'bytes');
      expectWidthAbout(await dataGrid.getColumnWidth('@message'), message.originalWidth);
    }
  );

  spaceTest(
    'does not reset the last column to auto width when auto-width columns remain',
    async ({ page, pageObjects }) => {
      const { dataGrid } = pageObjects;
      await dataGrid.addFieldFromSidebar('@message');
      await dataGrid.addFieldFromSidebar('bytes');

      const bytes = await dataGrid.resizeColumn('bytes', -200);
      expect(bytes.newWidth).toBeLessThan(bytes.originalWidth);
      expectWidthAbout(bytes.newWidth, bytes.originalWidth - 200);

      await dataGrid.addFieldFromSidebar('agent');
      const agent = await dataGrid.resizeColumn('agent', -100);
      expectWidthAbout(agent.newWidth, agent.originalWidth - 100);

      await removeColumn(page, dataGrid, 'bytes');
      expectWidthAbout(await dataGrid.getColumnWidth('agent'), agent.newWidth);
    }
  );

  spaceTest(
    'allows resetting column width in the surrounding-docs view',
    async ({ pageObjects }) => {
      const { dataGrid } = pageObjects;
      await dataGrid.addFieldFromSidebar('@message');
      await dataGrid.openSurroundingDocuments(0);

      await expect(dataGrid.getColumnHeader('@message')).toBeVisible({ timeout: 30_000 });
      await testResizeColumn(dataGrid, '@message');
    }
  );
});
