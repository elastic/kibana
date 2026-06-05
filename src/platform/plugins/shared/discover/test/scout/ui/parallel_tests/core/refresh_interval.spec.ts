/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover auto-refresh: enabling a refresh interval should re-issue the
 * search request on each tick. Migrated from the "refresh interval"
 * describe in `src/platform/test/functional/apps/discover/group1/_discover.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

const REFRESH_INTERVAL_SECONDS = 5;

spaceTest.describe('Discover - refresh interval', { tag: tags.stateful.all }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.discover.setQueryMode('classic');
    await pageObjects.discover.goto();
    await pageObjects.discover.waitUntilSearchingHasFinished();
  });

  spaceTest.afterEach(async ({ pageObjects }) => {
    // Pause auto-refresh between tests so it doesn't leak into other specs
    // running in the same worker after a soft-failure.
    await pageObjects.datePicker.pauseAutoRefresh().catch(() => undefined);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest('refetches when auto-refresh is enabled', async ({ pageObjects }) => {
    await pageObjects.datePicker.startAutoRefresh(REFRESH_INTERVAL_SECONDS);
    await pageObjects.discover.waitUntilSearchingHasFinished();

    const readRequestTimestamp = async (): Promise<string> => {
      await pageObjects.discover.openInspectorFromTabMenu();
      const timestamp = await pageObjects.inspector.getRequestTimestamp();
      await pageObjects.inspector.close();
      return timestamp;
    };

    const before = await readRequestTimestamp();

    // The auto-refresh ticker fires every `REFRESH_INTERVAL_SECONDS`. Allow a
    // 4× window to absorb worst-case scheduler/CI jitter rather than tying
    // the test directly to the interval.
    await expect
      .poll(readRequestTimestamp, {
        timeout: REFRESH_INTERVAL_SECONDS * 4 * 1000,
        message: `request timestamp should change after auto-refresh ticks (was ${before})`,
      })
      .not.toBe(before);
  });
});
