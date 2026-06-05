/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover doc-viewer flyout: opening a single document and adding an
 * exists filter from the flyout. Migrated from
 * `src/platform/test/functional/apps/discover/group2_data_grid1/_data_grid_doc_navigation.ts`.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

spaceTest.describe('Discover data grid - doc navigation', { tag: tags.stateful.all }, () => {
  // FTR ran at 1600x1200 via `browser.setWindowSize`; match that so the
  // doc-viewer flyout has room to render its inline field cell actions.
  spaceTest.use({ viewport: { width: 1600, height: 1200 } });

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
    await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
    await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    // FTR used `kibana_admin + test_logstash_reader`; admin covers both since
    // built-in viewer/editor/admin in stateful all read `logstash-*`.
    await browserAuth.loginAsAdmin();
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
    'opens the single-document view from the flyout row actions',
    async ({ page, pageObjects }) => {
      await pageObjects.discover.openAndWaitForDocViewerFlyout({ rowIndex: 0 });

      // The first row action is "View single document"; clicking it navigates
      // to `/app/discover#/doc/...` which renders the `doc-hit` container.
      await pageObjects.discover.clickRowActionInFlyout('singleDocument');

      await expect(page.testSubj.locator('doc-hit')).toBeVisible({ timeout: 30_000 });
    }
  );

  spaceTest(
    'adds an exists filter for a field from the doc-viewer flyout',
    async ({ pageObjects }) => {
      await pageObjects.discover.openAndWaitForDocViewerFlyout({ rowIndex: 0 });
      await pageObjects.discover.clickFieldActionInFlyout('@timestamp', 'addExistsFilterButton');

      expect(
        await pageObjects.filterBar.hasFilter({
          field: '@timestamp',
          value: 'exists',
          enabled: true,
          pinned: false,
          negated: false,
        })
      ).toBe(true);
    }
  );
});
