/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Save session recency tests.
 *
 * A session saved with the "Recently explored" sort stores only the sort
 * criteria. The recency history itself lives in each browser's local storage,
 * so the order a reopened session shows must come from the opener's history,
 * not from the browser that saved it.
 */

import { expect } from '@kbn/scout/ui';
import type { MetricsGridSortField } from '@kbn/discover-utils';
import { spaceTest, testData, DEFAULT_TIME_RANGE, DEFAULT_CONFIG } from '../fixtures';

const SAVED_SEARCH_NAME = 'Metrics Recency History Test';
const RECENCY_SORT_FIELD: MetricsGridSortField = 'recency';
const ALPHABETICAL_METRIC_NAMES = DEFAULT_CONFIG.metrics
  .map(({ name }) => name)
  .sort((a, b) => a.localeCompare(b));
// With no history, recency falls back to alphabetical order.
const FIRST_METRIC = ALPHABETICAL_METRIC_NAMES[0];
// Explored in the saving browser: the second card of the default alphabetical grid.
const SAVER_METRIC = ALPHABETICAL_METRIC_NAMES[1];
const SAVER_CARD_INDEX = 1;
// Explored in the opening browser only.
const OPENER_METRIC = ALPHABETICAL_METRIC_NAMES[ALPHABETICAL_METRIC_NAMES.length - 1];

spaceTest.describe(
  'Metrics in Discover - Save Session Recency',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      "orders a reopened recency session by the opener's own history",
      async ({ pageObjects, page, openSeparateBrowser }) => {
        const { metricsExperience, discover } = pageObjects;
        let sessionUrl = '';

        await spaceTest.step('explore a metric in the saving browser', async () => {
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
          await expect(metricsExperience.grid).toBeVisible();
          await metricsExperience.waitForFirstCard(`${FIRST_METRIC}-0`);
          await metricsExperience.openInsightsFlyout(SAVER_CARD_INDEX);
          await metricsExperience.flyout.closeButton.click();
          await metricsExperience.flyout.container.waitFor({ state: 'hidden' });
          await expect
            .poll(() => metricsExperience.getRecentlyExploredMetrics())
            .toStrictEqual([metricsExperience.getRecentlyExploredMetricKey(SAVER_METRIC)]);
        });

        await spaceTest.step('save the session sorted by recency', async () => {
          await metricsExperience.selectSortBy(RECENCY_SORT_FIELD);
          await metricsExperience.waitForFirstCard(`${SAVER_METRIC}-0`);
          await expect
            .poll(() => metricsExperience.getPersistedMetricsStateField('sortField'))
            .toBe(RECENCY_SORT_FIELD);
          await discover.saveSearch(SAVED_SEARCH_NAME);
          await expect.poll(() => page.url()).toContain('#/view/');
          sessionUrl = page.url();
        });

        const opener = await openSeparateBrowser();

        await spaceTest.step('open the session in a browser with its own history', async () => {
          await opener.page.goto(sessionUrl);
          // A cold Discover load in a new browser regularly exceeds the default 10s on serverless.
          await expect(opener.metricsExperience.grid).toBeVisible({ timeout: 30_000 });
          // The opener has explored nothing yet, so it does not carry the saver's history.
          expect(await opener.metricsExperience.getRecentlyExploredMetrics()).toStrictEqual([]);
          await opener.metricsExperience.setRecentlyExploredMetrics([
            opener.metricsExperience.getRecentlyExploredMetricKey(OPENER_METRIC),
          ]);
          await opener.page.reload();
          await expect(opener.metricsExperience.grid).toBeVisible({ timeout: 30_000 });
        });

        await spaceTest.step('the recency order follows the opener history', async () => {
          await expect(opener.metricsExperience.sortSelectorButton).toHaveAttribute(
            'data-selected-value',
            RECENCY_SORT_FIELD
          );
          await opener.metricsExperience.waitForFirstCard(`${OPENER_METRIC}-0`);
          // The saver's explored metric is not promoted; unexplored metrics stay alphabetical.
          // Card ids end with the card's position in the grid.
          await expect(opener.metricsExperience.getCardByIndex(1)).toHaveAttribute(
            'id',
            `${FIRST_METRIC}-1`
          );
        });
      }
    );
  }
);
