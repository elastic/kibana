/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '@kbn/scout';
import { testData } from '../../fixtures/common';

type DiscoverApp = PageObjects['discover'];

// Widths are read via Playwright bounding boxes (sub-pixel floats), while the
// resizer maps ~1:1 to the drag delta. A small tolerance absorbs sub-pixel
// rounding; the assertions distinguish widths that differ by >=100px.
const WIDTH_TOLERANCE_PX = 4;

const expectWidthAbout = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(WIDTH_TOLERANCE_PX);

const testResizeColumn = async (discover: DiscoverApp, field: string) => {
  const { originalWidth, newWidth } = await discover.resizeColumn(field, -100);
  expectWidthAbout(newWidth, originalWidth - 100);

  await discover.resetColumnWidth(field);
  expectWidthAbout(await discover.getColumnWidth(field), originalWidth);
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
    await pageObjects.discover.waitUntilSearchingHasFinished();
    await pageObjects.discover.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'does not show the reset-width button for an auto-width column',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      await discover.addFieldFromSidebar('@message');
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.resetColumnWidthExists('@message')).toBe(false);
    }
  );

  spaceTest(
    'shows the reset-width button for an absolute-width column and resets to auto',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      await discover.addFieldFromSidebar('@message');
      await discover.waitUntilSearchingHasFinished();

      expect(await discover.getColumnWidth('@message')).toBeGreaterThan(0);
      await testResizeColumn(discover, '@message');
    }
  );

  spaceTest(
    'resets the last column to auto width if only absolute-width columns remain',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      await discover.addFieldFromSidebar('@message');

      const message = await discover.resizeColumn('@message', -300);
      expect(message.newWidth).toBeLessThan(message.originalWidth);
      expectWidthAbout(message.newWidth, message.originalWidth - 300);

      await discover.addFieldFromSidebar('bytes');
      const bytes = await discover.resizeColumn('bytes', -100);
      expectWidthAbout(bytes.newWidth, bytes.originalWidth - 100);

      expectWidthAbout(await discover.getColumnWidth('@message'), message.newWidth);

      await discover.removeColumn('bytes');
      expectWidthAbout(await discover.getColumnWidth('@message'), message.originalWidth);
    }
  );

  spaceTest(
    'does not reset the last column to auto width when auto-width columns remain',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      await discover.addFieldFromSidebar('@message');
      await discover.addFieldFromSidebar('bytes');

      const bytes = await discover.resizeColumn('bytes', -200);
      expect(bytes.newWidth).toBeLessThan(bytes.originalWidth);
      expectWidthAbout(bytes.newWidth, bytes.originalWidth - 200);

      await discover.addFieldFromSidebar('agent');
      const agent = await discover.resizeColumn('agent', -100);
      expectWidthAbout(agent.newWidth, agent.originalWidth - 100);

      await discover.removeColumn('bytes');
      expectWidthAbout(await discover.getColumnWidth('agent'), agent.newWidth);
    }
  );

  spaceTest(
    'allows resetting column width in the surrounding-docs view',
    async ({ pageObjects }) => {
      const { discover } = pageObjects;
      await discover.addFieldFromSidebar('@message');
      await discover.openSurroundingDocuments(0);

      await expect(discover.getColumnHeader('@message')).toBeVisible({ timeout: 30_000 });
      await testResizeColumn(discover, '@message');
    }
  );
});
