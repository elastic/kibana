/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { testData } from '../../fixtures/common';
import { DISCOVER_LOGSTASH_ALL_ROLE } from '../../fixtures/common/custom_roles';
import {
  closeSidebar,
  closeTablePanel,
  hitCount,
  isButtonDisabled,
  openSidebar,
  openTablePanel,
} from '../../fixtures/common/discover_panels';

const DEFAULT_TIME_RANGE = `{ "from": "${testData.DEFAULT_TIME_RANGE.from}", "to": "${testData.DEFAULT_TIME_RANGE.to}"}`;
// Note: this query is intentionally non-aggregate (no `stats ... by ...`).
// In the default cascade layout, an aggregate ES|QL query swaps the
// `discoverDocTable` for a grouped/cascade rendering, which would break the
// table-toggle assertions below. A simple `limit` query keeps the standard
// doc table while still returning a smaller, distinct hit count (5) so we
// can verify the new query took effect after submission.
const ESQL_LIMITED_QUERY = 'from logstash-* | sort @timestamp desc | limit 5';

const assertEsqlChartState = async ({
  page,
  sidebarOpen,
  chartOpen,
  tableOpen,
  totalHits,
}: {
  page: ScoutPage;
  sidebarOpen: boolean;
  chartOpen: boolean;
  tableOpen: boolean;
  totalHits: string;
}) => {
  if (tableOpen) {
    await expect(hitCount(page)).toHaveText(totalHits);
  }

  await expect(page.testSubj.locator('fieldList')).toHaveCount(sidebarOpen ? 1 : 0);
  await expect(page.testSubj.locator('unifiedHistogramChart')).toHaveCount(chartOpen ? 1 : 0);
  await expect(page.testSubj.locator('discoverDocTable')).toHaveCount(tableOpen ? 1 : 0);
};

test.describe(
  'Discover panel toggles in ESQL chart modes',
  { tag: testData.DISCOVER_STATEFUL_TAGS },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.importExport.load(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.uiSettings.update({
        defaultIndex: testData.DEFAULT_DATA_VIEW,
        'timepicker:timeDefaults': DEFAULT_TIME_RANGE,
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(DISCOVER_LOGSTASH_ALL_ROLE);
      await pageObjects.discover.goto({ queryMode: 'esql' });
      await pageObjects.discover.waitUntilSearchingHasFinished();
      await pageObjects.discover.waitForDocTableRendered();
    });

    test.afterAll(async ({ kbnClient }) => {
      await Promise.all([
        kbnClient.uiSettings.unset('defaultIndex'),
        kbnClient.uiSettings.unset('timepicker:timeDefaults'),
      ]);
      await kbnClient.importExport.unload(testData.DISCOVER_KBN_ARCHIVE);
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('toggles panels for the default ESQL histogram chart', async ({ page, pageObjects }) => {
      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: true,
        totalHits: '1,000',
      });

      await closeSidebar(page);
      await assertEsqlChartState({
        page,
        sidebarOpen: false,
        chartOpen: true,
        tableOpen: true,
        totalHits: '1,000',
      });
      await openSidebar(page);

      await pageObjects.discover.hideChart();
      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: false,
        tableOpen: true,
        totalHits: '1,000',
      });
      expect(await isButtonDisabled(page, 'dscHideTableButton')).toBe(true);
      await pageObjects.discover.showChart();

      await closeTablePanel(page);
      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: false,
        totalHits: '1,000',
      });
      expect(await isButtonDisabled(page, 'dscHideHistogramButton')).toBe(true);
      await openTablePanel(page);

      await closeSidebar(page);
      await pageObjects.discover.hideChart();
      await assertEsqlChartState({
        page,
        sidebarOpen: false,
        chartOpen: false,
        tableOpen: true,
        totalHits: '1,000',
      });
      await openSidebar(page);
      await pageObjects.discover.showChart();
    });

    test('toggles panels for a non-aggregate ES|QL query', async ({ page, pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(ESQL_LIMITED_QUERY);
      await pageObjects.discover.waitForDocTableRendered();

      // After switching from the default ES|QL query (1,000 hits) to a
      // narrowed `| limit 5` query, Discover updates the doc table, the hit
      // count, and the chart suggestion independently. CI is slower than
      // local: the hit count can still read "1,000" (from the prior render)
      // for a moment after the table is rendered, which is longer than
      // Playwright's default 5s expect timeout. Anchor the rest of the
      // assertions on the updated hit count first, with a generous timeout.
      await expect(hitCount(page)).toHaveText('5', { timeout: 30_000 });
      await expect(page.testSubj.locator('unifiedHistogramChart')).toBeVisible({
        timeout: 30_000,
      });

      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: true,
        totalHits: '5',
      });

      await closeSidebar(page);
      await assertEsqlChartState({
        page,
        sidebarOpen: false,
        chartOpen: true,
        tableOpen: true,
        totalHits: '5',
      });
      await openSidebar(page);

      await pageObjects.discover.hideChart();
      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: false,
        tableOpen: true,
        totalHits: '5',
      });
      await pageObjects.discover.showChart();

      await closeTablePanel(page);
      await assertEsqlChartState({
        page,
        sidebarOpen: true,
        chartOpen: true,
        tableOpen: false,
        totalHits: '5',
      });
      await openTablePanel(page);
    });
  }
);
