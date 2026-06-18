/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';

// Use a `logstash*` wildcard (not `log*`) so the ad-hoc data view resolves to
// exactly the `logstash_functional` fixture indices. A broader `log*` would
// also match unrelated `log*` indices on the shared cluster (e.g. synthtrace
// `logs-*` data streams), making hit-count assertions non-deterministic.
const NO_TIME_DATA_VIEW = 'logstash*';

spaceTest.describe(
  'Discover panel toggles in ESQL without a time field',
  {
    tag: tags.stateful.all,
  },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
      await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
      await apiServices.dataViews.create({
        title: NO_TIME_DATA_VIEW,
        spaceId: scoutSpace.id,
        override: true,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectDataView(NO_TIME_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectTextBaseLang();
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.dataViews.deleteByTitle(NO_TIME_DATA_VIEW, scoutSpace.id);
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'toggles the sidebar in ESQL mode for a no-time-field data view',
      async ({ page, pageObjects }) => {
        await expect(page.testSubj.locator('discoverQueryHits')).toHaveText('1,000');
        await expect(page.testSubj.locator('fieldList')).toBeVisible();
        await expect(page.testSubj.locator('discoverDocTable')).toBeVisible();

        // The cascade layout (default since the `discover.cascadeLayoutEnabled`
        // feature flag rolled out) keeps the histogram panel visible for ES|QL
        // queries on a no-time-field data view, so chart toggle controls remain
        // wired up. The legacy FTR `_panels_toggle` suite ran with the flag
        // disabled and asserted these controls were absent — that is no longer
        // representative of what users see by default.
        await expect(page.testSubj.locator('dscHideHistogramButton')).toBeVisible();
        await expect(page.testSubj.locator('dscShowHistogramButton')).toHaveCount(0);
        await pageObjects.discover.hideChart();
        await expect(page.testSubj.locator('unifiedHistogramChart')).toHaveCount(0);
        await expect(page.testSubj.locator('dscShowHistogramButton')).toBeVisible();
        await pageObjects.discover.showChart();
        await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible();

        await pageObjects.discover.closeSidebar();
        await expect(page.testSubj.locator('fieldList')).toHaveCount(0);
        await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible();

        await pageObjects.discover.openSidebar();
        await expect(page.testSubj.locator('fieldList')).toBeVisible();
        await expect(page.testSubj.locator('dscHideSidebarButton')).toBeVisible();
      }
    );
  }
);
