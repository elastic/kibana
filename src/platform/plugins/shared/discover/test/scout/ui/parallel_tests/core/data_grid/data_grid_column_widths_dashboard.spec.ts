/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dashboard embeddable behavior for Discover data-grid column resizing and reset.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../../fixtures/common';

const WIDTH_TOLERANCE_PX = 4;

const expectWidthAbout = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(WIDTH_TOLERANCE_PX);

spaceTest.describe(
  'Discover data grid column widths - dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      // Creating + saving a dashboard requires write access.
      await browserAuth.loginAsAdmin();
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary(testData.SAVED_SEARCH_TITLE);
      await pageObjects.dashboard.waitForRenderComplete();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('allows resetting column width in a Dashboard panel', async ({ pageObjects }) => {
      const { dataGrid } = pageObjects;
      const { originalWidth, newWidth } = await dataGrid.resizeColumn('_source', -100);
      expect(newWidth).toBeLessThan(originalWidth);
      expectWidthAbout(newWidth, originalWidth - 100);

      await dataGrid.resetColumnWidth('_source');
      expectWidthAbout(await dataGrid.getColumnWidth('_source'), originalWidth);
    });

    spaceTest('uses a custom column width on a saved Dashboard', async ({ page, pageObjects }) => {
      const { dashboard, dataGrid } = pageObjects;
      const { originalWidth, newWidth } = await dataGrid.resizeColumn('_source', -100);
      expect(newWidth).toBeLessThan(originalWidth);
      expectWidthAbout(newWidth, originalWidth - 100);

      await dashboard.saveDashboard('test');
      await page.reload();
      await dashboard.waitForRenderComplete();

      expectWidthAbout(await dataGrid.getColumnWidth('_source'), newWidth);
    });
  }
);
