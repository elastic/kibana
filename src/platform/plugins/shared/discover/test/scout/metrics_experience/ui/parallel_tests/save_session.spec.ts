/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Save session tests.
 *
 * Validates that a fully configured metrics view (ES|QL query with a WHERE
 * clause, stored time range, breakdown dimensions, grid settings, search
 * term, and sort) can be saved, reloaded, and restored after unsaved
 * metrics-specific changes, including a sort change.
 */

import { expect } from '@kbn/scout/ui';
import { METRICS_GRID_SORT_DEFAULTS, type MetricsGridSortField } from '@kbn/discover-utils';
import { spaceTest, testData, DEFAULT_TIME_RANGE, DEFAULT_CONFIG } from '../fixtures';

const SAVED_SEARCH_NAME = 'Metrics Tier 3 Save Test';
const SORT_REVERT_SEARCH_NAME = 'Metrics Sort Revert Test';
const RECENCY_SEARCH_NAME = 'Metrics Recency Save Test';
const RECENCY_SORT_FIELD: MetricsGridSortField = 'recency';
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
// First cards of the unfiltered TS query in each alphabetical direction.
const ALPHABETICAL_METRIC_NAMES = DEFAULT_CONFIG.metrics
  .map(({ name }) => name)
  .sort((a, b) => a.localeCompare(b));
const UNFILTERED_FIRST_CARD_ASC = `${ALPHABETICAL_METRIC_NAMES[0]}-0`;
const UNFILTERED_FIRST_CARD_DESC = `${
  ALPHABETICAL_METRIC_NAMES[ALPHABETICAL_METRIC_NAMES.length - 1]
}-0`;
const FILTERED_QUERY = `${testData.ESQL_QUERIES.TS} | WHERE ${FIRST_DIMENSION} == "${FILTERED_DIMENSION_VALUE}"`;
// Narrower than DEFAULT_TIME_RANGE so the restored range is distinguishable from the default.
const SAVED_TIME_RANGE = {
  from: 'Jan 1, 2025 @ 00:00:00.000',
  to: 'Mar 31, 2025 @ 23:59:59.000',
};

spaceTest.describe(
  'Metrics in Discover - Save Session',
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

    spaceTest('should save and restore a metrics session', async ({ pageObjects, page }) => {
      const { metricsExperience, discover, datePicker } = pageObjects;

      await spaceTest.step('submit a filtered query and set the time range', async () => {
        await discover.writeAndSubmitEsqlQuery(FILTERED_QUERY);
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.getCardByIndex(0)).toBeVisible();
        await datePicker.setAbsoluteRange(SAVED_TIME_RANGE);
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
        await expect
          .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
          .toBe('desc');
      });

      const timeConfigBefore = await datePicker.getTimeConfig();
      const cardCountBefore = await metricsExperience.getVisibleCardCount();
      const queryBefore = await discover.getEsqlQueryValue();

      await spaceTest.step('save the current metrics session with its time range', async () => {
        await discover.saveSearch(SAVED_SEARCH_NAME, { storeTimeRange: true });
      });

      await spaceTest.step('start a new Discover session', async () => {
        await discover.clickNewSearch();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeHidden();
        // The sort toolbar only renders for a metrics (TS) query. Check the default sort while the
        // default time range still has data, so the grid is not empty.
        await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        await expect(metricsExperience.grid).toBeVisible();
        // The sort lives in the new session's state, so it must not carry over from the saved one.
        await expect(metricsExperience.sortDirectionAsc).toHaveAttribute('aria-pressed', 'true');
        // Move away from the saved range so the restore below is observable.
        await datePicker.setAbsoluteRange({
          from: 'Jul 1, 2025 @ 00:00:00.000',
          to: 'Sep 30, 2025 @ 23:59:59.000',
        });
        await discover.waitUntilSearchingHasFinished();
      });

      await spaceTest.step('load the saved search', async () => {
        await discover.loadSavedSearch(SAVED_SEARCH_NAME);
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

      await spaceTest.step('stored time range should be restored', async () => {
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

      await spaceTest.step('remove a saved breakdown selection', async () => {
        await metricsExperience.breakdownSelector.selectDimension(SECOND_DIMENSION);
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeHidden();
        await expect(discover.unsavedChangesIndicator()).toBeVisible();
      });

      await spaceTest.step('revert to the saved breakdown selection', async () => {
        await discover.revertUnsavedChanges();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(FIRST_DIMENSION)
        ).toBeVisible();
        await expect(
          metricsExperience.breakdownSelector.getToggleWithSelection(SECOND_DIMENSION)
        ).toBeVisible();
        await expect(metricsExperience.searchInput).toHaveValue(SEARCH_TERM);
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });
    });

    spaceTest(
      'should flag a sort change as unsaved and revert to the saved sort',
      async ({ pageObjects }) => {
        const { metricsExperience, discover } = pageObjects;

        await spaceTest.step('save a session sorted in descending order', async () => {
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
          await expect(metricsExperience.grid).toBeVisible();
          await metricsExperience.setSortDirection('desc');
          await metricsExperience.waitForFirstCard(UNFILTERED_FIRST_CARD_DESC);
          await expect
            .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
            .toBe('desc');
          await discover.saveSearch(SORT_REVERT_SEARCH_NAME);
          await expect(discover.unsavedChangesIndicator()).toBeHidden();
        });

        await spaceTest.step('changing the sort direction marks the session unsaved', async () => {
          await metricsExperience.setSortDirection('asc');
          await metricsExperience.waitForFirstCard(UNFILTERED_FIRST_CARD_ASC);
          await expect(discover.unsavedChangesIndicator()).toBeVisible();
        });

        await spaceTest.step('reverting restores the saved sort', async () => {
          await discover.revertUnsavedChanges();
          await expect(metricsExperience.sortDirectionDesc).toHaveAttribute('aria-pressed', 'true');
          await metricsExperience.waitForFirstCard(UNFILTERED_FIRST_CARD_DESC);
          await expect(discover.unsavedChangesIndicator()).toBeHidden();
        });
      }
    );

    spaceTest('should reopen a session saved with the recency sort', async ({ pageObjects }) => {
      const { metricsExperience, discover } = pageObjects;

      await spaceTest.step('save a session sorted by recency', async () => {
        await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        await expect(metricsExperience.grid).toBeVisible();
        await metricsExperience.selectSortBy(RECENCY_SORT_FIELD);
        await expect(metricsExperience.sortSelectorButton).toHaveAttribute(
          'data-selected-value',
          RECENCY_SORT_FIELD
        );
        await expect
          .poll(() => metricsExperience.getPersistedMetricsStateField('sortField'))
          .toBe(RECENCY_SORT_FIELD);
        await discover.saveSearch(RECENCY_SEARCH_NAME);
      });

      await spaceTest.step('start a new session with the default sort', async () => {
        await discover.clickNewSearch();
        await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.sortSelectorButton).toHaveAttribute(
          'data-selected-value',
          METRICS_GRID_SORT_DEFAULTS.sortField
        );
      });

      await spaceTest.step('reopening the saved session restores the recency sort', async () => {
        await discover.loadSavedSearch(RECENCY_SEARCH_NAME);
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.sortSelectorButton).toHaveAttribute(
          'data-selected-value',
          RECENCY_SORT_FIELD
        );
        // Recency is always most-recent-first, so the direction toggle stays disabled.
        await expect(metricsExperience.sortDirectionAsc).toBeDisabled();
        await expect(discover.unsavedChangesIndicator()).toBeHidden();
      });
    });

    spaceTest(
      'should open a session saved before sort was persisted with the default sort',
      async ({ pageObjects, scoutSpace }) => {
        const { metricsExperience, discover } = pageObjects;
        const { DEFAULT_BREAKDOWN } = testData.METRICS_DIMENSION_FIELDS;

        await spaceTest.step('import a session saved without sort fields', async () => {
          await scoutSpace.savedObjects.load(testData.LEGACY_SORT_SESSION_KBN_ARCHIVE);
        });

        await spaceTest.step('sort the current session in descending order', async () => {
          // A non-default local sort makes it observable whether opening the session resets it.
          await discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
          await expect(metricsExperience.grid).toBeVisible();
          await metricsExperience.setSortDirection('desc');
          await metricsExperience.waitForFirstCard(UNFILTERED_FIRST_CARD_DESC);
          await expect
            .poll(() => metricsExperience.getPersistedMetricsStateField('sortDirection'))
            .toBe('desc');
        });

        await spaceTest.step('open the session saved before sort was persisted', async () => {
          await discover.loadSavedSearch(testData.LEGACY_SORT_SESSION_TITLE);
          await expect(metricsExperience.grid).toBeVisible();
          await expect(
            metricsExperience.breakdownSelector.getToggleWithSelection(DEFAULT_BREAKDOWN)
          ).toBeVisible();
        });

        await spaceTest.step('the default sort applies and nothing is unsaved', async () => {
          await expect(metricsExperience.sortSelectorButton).toHaveAttribute(
            'data-selected-value',
            METRICS_GRID_SORT_DEFAULTS.sortField
          );
          await expect(metricsExperience.sortDirectionAsc).toHaveAttribute('aria-pressed', 'true');
          await metricsExperience.waitForFirstCard(UNFILTERED_FIRST_CARD_ASC);
          await expect(discover.unsavedChangesIndicator()).toBeHidden();
        });
      }
    );
  }
);
