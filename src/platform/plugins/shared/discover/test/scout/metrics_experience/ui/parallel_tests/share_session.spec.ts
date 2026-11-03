/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Share session tests.
 *
 * Validates that a fully configured metrics view (ES|QL query with a WHERE
 * clause, time range, breakdown dimensions, grid settings, search term, and
 * sort) can be shared via URL and that opening that URL restores every piece of
 * that state. A shared "Recently explored" sort carries only the criteria: the
 * recipient's order comes from the recipient's own browser history.
 */

import { expect } from '@kbn/scout/ui';
import type { MetricsGridSortField } from '@kbn/discover-utils';
import { spaceTest, testData, DEFAULT_TIME_RANGE, DEFAULT_CONFIG } from '../fixtures';

const FIRST_DIMENSION = DEFAULT_CONFIG.dimensions[0].name;
const SECOND_DIMENSION = DEFAULT_CONFIG.dimensions[1].name;
const FILTERED_DIMENSION_VALUE = DEFAULT_CONFIG.dimensions[0].values[0];
const SEARCH_TERM = 'counter_0';
// Metric search tolerates one-character typos, so `counter_0` also matches the other single-digit
// counters. Sorting descending therefore puts the alphabetically last counter first.
const LAST_COUNTER_METRIC = DEFAULT_CONFIG.metrics
  .filter(({ type }) => type === 'counter')
  .map(({ name }) => name)
  .sort((a, b) => b.localeCompare(a))[0];
const FIRST_CARD_DESC = `${LAST_COUNTER_METRIC}-0`;
const RECENCY_SORT_FIELD: MetricsGridSortField = 'recency';
const ALPHABETICAL_METRIC_NAMES = DEFAULT_CONFIG.metrics
  .map(({ name }) => name)
  .sort((a, b) => a.localeCompare(b));
// With no history, recency falls back to alphabetical order.
const FIRST_METRIC = ALPHABETICAL_METRIC_NAMES[0];
// Explored by the sharer: the second card of the default alphabetical grid.
const SHARER_METRIC = ALPHABETICAL_METRIC_NAMES[1];
const SHARER_CARD_INDEX = 1;
// Explored by the recipient only.
const RECIPIENT_METRIC = ALPHABETICAL_METRIC_NAMES[ALPHABETICAL_METRIC_NAMES.length - 1];
const FILTERED_QUERY = `${testData.ESQL_QUERIES.TS} | WHERE ${FIRST_DIMENSION} == "${FILTERED_DIMENSION_VALUE}"`;
// Narrower than DEFAULT_TIME_RANGE so the restored range is distinguishable from the default.
const SHARED_TIME_RANGE = {
  from: 'Jan 1, 2025 @ 00:00:00.000',
  to: 'Mar 31, 2025 @ 23:59:59.000',
};

spaceTest.describe(
  'Metrics in Discover - Share Session',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'should preserve metrics view state through a shared URL',
      async ({ pageObjects, page }) => {
        const { metricsExperience, discover, datePicker } = pageObjects;

        await spaceTest.step('submit a filtered query and set the time range', async () => {
          await discover.writeAndSubmitEsqlQuery(FILTERED_QUERY);
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
          await datePicker.setAbsoluteRange(SHARED_TIME_RANGE);
          await discover.waitUntilSearchingHasFinished();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });

        await spaceTest.step('select two breakdown dimensions', async () => {
          await metricsExperience.breakdownSelector.selectDimension(FIRST_DIMENSION);
          await metricsExperience.breakdownSelector.selectDimension(SECOND_DIMENSION);
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
          ).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
          ).toBeVisible();
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('configure aggregations and filter the grid', async () => {
          await metricsExperience.gridSettings.open();
          await metricsExperience.gridSettings.selectCounterAggregation('max');
          await metricsExperience.gridSettings.selectGaugeAggregation('min');
          await metricsExperience.gridSettings.selectHistogramPercentile('p50');
          await metricsExperience.gridSettings.apply();
          await metricsExperience.searchMetric(SEARCH_TERM);
          await metricsExperience.waitForFirstCard('counter_0-0');
          // The search term is debounced; wait for it to reach the URL profile state before
          // sharing or saving.
          await expect
            .poll(() => metricsExperience.getProfileState(page.url()))
            .toContain(`searchTerm:${SEARCH_TERM}`);
        });

        await spaceTest.step('sort the grid in descending order', async () => {
          await metricsExperience.setSortDirection('desc');
          await expect(metricsExperience.sortDirectionDesc).toHaveAttribute('aria-pressed', 'true');
          await metricsExperience.waitForFirstCard(FIRST_CARD_DESC);
          // The share URL is built from the URL state, which `kbnUrlControls` writes asynchronously.
          await expect
            .poll(() => metricsExperience.getProfileState(page.url()))
            .toContain('sortDirection:desc');
        });

        const timeConfigBefore = await datePicker.getTimeConfig();
        const cardCountBefore = await metricsExperience.getVisibleCardCount();
        const queryBefore = await discover.getEsqlQueryValue();

        let sharedUrl: string;

        await spaceTest.step('open share modal and copy the URL', async () => {
          await metricsExperience.share.openShareModal();
          sharedUrl = await metricsExperience.share.getSharedUrl();
          expect(sharedUrl).toBeTruthy();
          await metricsExperience.share.closeShareModal();
        });

        await spaceTest.step('navigate to shared URL', async () => {
          await page.goto(sharedUrl!);
          await discover.waitUntilSearchingHasFinished();
        });

        await spaceTest.step('metrics grid should be restored', async () => {
          await expect(metricsExperience.grid).toBeVisible();
          await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        });

        await spaceTest.step(
          'ES|QL query including the WHERE clause should be preserved',
          async () => {
            await expect.poll(() => discover.getEsqlQueryValue()).toBe(queryBefore);
            expect(queryBefore).toBe(FILTERED_QUERY);
          }
        );

        await spaceTest.step('time range should be preserved', async () => {
          expect(await datePicker.getTimeConfig()).toStrictEqual(timeConfigBefore);
        });

        await spaceTest.step('breakdown selections should be preserved', async () => {
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
          ).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
          ).toBeVisible();
        });

        await spaceTest.step('grid settings and search should be preserved', async () => {
          await expect(metricsExperience.searchInput).toHaveValue(SEARCH_TERM);
          await metricsExperience.gridSettings.open();
          await expect(metricsExperience.gridSettings.counterSelect).toContainText('Maximum');
          await expect(metricsExperience.gridSettings.gaugeSelect).toContainText('Minimum');
          await expect(metricsExperience.gridSettings.histogramSelect).toContainText(
            '50th percentile'
          );
          await metricsExperience.gridSettings.cancel();
        });

        await spaceTest.step('sort should be preserved', async () => {
          await expect(metricsExperience.sortDirectionDesc).toHaveAttribute('aria-pressed', 'true');
          await metricsExperience.waitForFirstCard(FIRST_CARD_DESC);
        });

        await spaceTest.step('card count should match the original session', async () => {
          await expect(metricsExperience.cards).toHaveCount(cardCountBefore);
        });
      }
    );

    spaceTest(
      "should share the recency sort but order by the recipient's own history",
      async ({ pageObjects, page, openSeparateBrowser }) => {
        const { metricsExperience, discover } = pageObjects;
        let sharedUrl = '';

        await spaceTest.step('explore a metric and sort by recency', async () => {
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
          await expect(metricsExperience.grid).toBeVisible();
          await metricsExperience.waitForFirstCard(`${FIRST_METRIC}-0`);
          await metricsExperience.openInsightsFlyout(SHARER_CARD_INDEX);
          await metricsExperience.flyout.closeButton.click();
          await metricsExperience.flyout.container.waitFor({ state: 'hidden' });
          await metricsExperience.selectSortBy(RECENCY_SORT_FIELD);
          await metricsExperience.waitForFirstCard(`${SHARER_METRIC}-0`);
          await expect
            .poll(() => metricsExperience.getProfileState(page.url()))
            .toContain(`sortField:${RECENCY_SORT_FIELD}`);
        });

        await spaceTest.step('copy the share URL', async () => {
          await metricsExperience.share.openShareModal();
          sharedUrl = await metricsExperience.share.getSharedUrl();
          await metricsExperience.share.closeShareModal();
        });

        const recipient = await openSeparateBrowser();

        await spaceTest.step('open the link in a browser with its own history', async () => {
          await recipient.page.goto(sharedUrl);
          // A cold Discover load in a new browser regularly exceeds the default 10s on serverless.
          await expect(recipient.metricsExperience.grid).toBeVisible({ timeout: 30_000 });
          // The share link redirects to the decoded state: the sort criteria, not the sharer's
          // explored metrics.
          const sharedProfileState = recipient.metricsExperience.getProfileState(
            recipient.page.url()
          );
          expect(sharedProfileState).toContain(`sortField:${RECENCY_SORT_FIELD}`);
          expect(sharedProfileState).not.toContain(SHARER_METRIC);
          expect(await recipient.metricsExperience.getRecentlyExploredMetrics()).toStrictEqual([]);
          await recipient.metricsExperience.setRecentlyExploredMetrics([
            recipient.metricsExperience.getRecentlyExploredMetricKey(RECIPIENT_METRIC),
          ]);
          await recipient.page.reload();
          await expect(recipient.metricsExperience.grid).toBeVisible({ timeout: 30_000 });
        });

        await spaceTest.step('recency is selected and follows the recipient history', async () => {
          await expect(recipient.metricsExperience.sortSelectorButton).toHaveAttribute(
            'data-selected-value',
            RECENCY_SORT_FIELD
          );
          await recipient.metricsExperience.waitForFirstCard(`${RECIPIENT_METRIC}-0`);
          // The sharer's explored metric is not promoted; unexplored metrics stay alphabetical.
          // Card ids end with the card's position in the grid.
          await expect(recipient.metricsExperience.getCardByIndex(1)).toHaveAttribute(
            'id',
            `${FIRST_METRIC}-1`
          );
        });
      }
    );
  }
);
