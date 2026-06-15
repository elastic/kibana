/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { EuiToastWrapper, spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

// Copying the column values produces a CSV-escaped string. The leading
// apostrophe on `@timestamp` is intentional formula-injection protection.
const EXPECTED_TIMESTAMP_COLUMN_PREFIX =
  '"\'@timestamp"\n"Sep 22, 2015 @ 23:50:13.253"\n"Sep 22, 2015 @ 23:43:58.175"';
const EXPECTED_SOURCE_COLUMN_PREFIX = 'Summary\n{"@message":["238.171.34.42';

const expectSingleToastThenDismiss = async (page: ScoutPage) => {
  const toasts = new EuiToastWrapper(page, { locator: '.euiToast' });

  await expect(toasts.getWrapper()).toHaveCount(1);

  await toasts.closeAllToasts();
};

/**
 * Best-effort clipboard read mirroring the FTR `canReadClipboard` guard: copying
 * always works (and always shows the success toast) regardless of permissions,
 * but reading the clipboard is only possible when the browser grants the
 * `clipboard-read` permission. Returns `null` when the clipboard can't be read so
 * callers can skip the content assertion instead of failing the whole test.
 */
const tryReadClipboard = async (page: ScoutPage): Promise<string | null> => {
  try {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    return await page.evaluate(() => navigator.clipboard.readText());
  } catch {
    return null;
  }
};

spaceTest.describe(
  'Discover data grid - copy to clipboard',
  { tag: tags.deploymentAgnostic },
  () => {
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

    spaceTest('copies a column values to clipboard', async ({ page, pageObjects }) => {
      await pageObjects.discover.clickCopyColumnValues('@timestamp');
      // `null` means the clipboard wasn't readable in this environment, so the
      // content check is skipped (best-effort) while the toast check below stays.
      const copiedTimestampData = await tryReadClipboard(page);
      expect(
        copiedTimestampData === null ||
          copiedTimestampData.startsWith(EXPECTED_TIMESTAMP_COLUMN_PREFIX),
        `copied @timestamp column "${copiedTimestampData}" should start with the expected values`
      ).toBe(true);
      await expectSingleToastThenDismiss(page);

      await pageObjects.discover.clickCopyColumnValues('_source');
      const copiedSourceData = await tryReadClipboard(page);
      expect(
        copiedSourceData === null ||
          (copiedSourceData.startsWith(EXPECTED_SOURCE_COLUMN_PREFIX) &&
            copiedSourceData.endsWith('}')),
        `copied _source column "${copiedSourceData}" should start with the summary and end with "}"`
      ).toBe(true);

      await expectSingleToastThenDismiss(page);
    });

    spaceTest('copies a column name to clipboard', async ({ page, pageObjects }) => {
      await pageObjects.discover.clickCopyColumnName('@timestamp');

      const copiedTimestampName = await tryReadClipboard(page);
      expect(
        copiedTimestampName === null || copiedTimestampName === '@timestamp',
        `copied column name "${copiedTimestampName}" should be "@timestamp"`
      ).toBe(true);

      await expectSingleToastThenDismiss(page);

      await pageObjects.discover.clickCopyColumnName('_source');

      const copiedSourceName = await tryReadClipboard(page);
      expect(
        copiedSourceName === null || copiedSourceName === 'Summary',
        `copied column name "${copiedSourceName}" should be "Summary"`
      ).toBe(true);

      await expectSingleToastThenDismiss(page);
    });
  }
);
