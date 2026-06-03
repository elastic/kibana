/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';
import { closeSidebar, openSidebar } from '../../fixtures/common/discover_panels';

const NO_TIME_DATA_VIEW = 'log*';
const DEFAULT_TIME_RANGE = `{ "from": "${testData.DEFAULT_TIME_RANGE.from}", "to": "${testData.DEFAULT_TIME_RANGE.to}"}`;

test.describe(
  'Discover panel toggles in ESQL without a time field',
  {
    tag: testData.DISCOVER_STATEFUL_TAGS,
  },
  () => {
    test.beforeAll(async ({ apiServices, kbnClient }) => {
      await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.uiSettings.update({
        defaultIndex: testData.DEFAULT_DATA_VIEW,
        'timepicker:timeDefaults': DEFAULT_TIME_RANGE,
      });
      await apiServices.dataViews.create({
        title: NO_TIME_DATA_VIEW,
        override: true,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'classic' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectDataView(NO_TIME_DATA_VIEW);
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.selectTextBaseLang();
      await pageObjects.discover.waitUntilSearchingHasFinished();
    });

    test.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.dataViews.deleteByTitle(NO_TIME_DATA_VIEW);
      await Promise.all([
        kbnClient.uiSettings.unset('defaultIndex'),
        kbnClient.uiSettings.unset('timepicker:timeDefaults'),
      ]);
      await kbnClient.importExport.unload(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('toggles the sidebar in ESQL mode for a no-time-field data view', async ({
      page,
      pageObjects,
    }) => {
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

      await closeSidebar(page);
      await expect(page.testSubj.locator('fieldList')).toHaveCount(0);
      await expect(page.testSubj.locator('dscShowSidebarButton')).toBeVisible();

      await openSidebar(page);
      await expect(page.testSubj.locator('fieldList')).toBeVisible();
      await expect(page.testSubj.locator('dscHideSidebarButton')).toBeVisible();
    });
  }
);
