/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Grid Navigation tests: pagination and search.
 *
 * These tests use a dynamically created TSDB index (test-metrics-experience)
 * with 45 metric fields (23 gauge + 22 counter) to exercise pagination
 * and search scenarios.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  PAGINATION,
  DEFAULT_TIME_RANGE,
  DEFAULT_CONFIG,
} from '../../fixtures/metrics_experience';

const { PAGE_SIZE, TOTAL_PAGES, LAST_PAGE_CARDS } = PAGINATION;

const SEARCH_METRIC_NAME = DEFAULT_CONFIG.metrics[0].name;

const SORTED_METRICS = [...DEFAULT_CONFIG.metrics].sort((a, b) => a.name.localeCompare(b.name));
const FIRST_CARD_PAGE_1 = `${SORTED_METRICS[0].name}-0`;
const FIRST_CARD_PAGE_2 = `${SORTED_METRICS[PAGE_SIZE].name}-0`;
const FIRST_CARD_LAST_PAGE = `${SORTED_METRICS[PAGE_SIZE * (TOTAL_PAGES - 1)].name}-0`;

// Failing: See https://github.com/elastic/kibana/issues/254759
spaceTest.describe.skip(
  'Metrics in Discover - Grid Navigation',
  {
    tag: testData.METRICS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.load(testData.KBN_ARCHIVE);
      await scoutSpace.uiSettings.setDefaultIndex(testData.DATA_VIEW_NAME);
      await scoutSpace.uiSettings.setDefaultTime(DEFAULT_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest('should paginate through metrics', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;

      await spaceTest.step('pagination is visible', async () => {
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.pagination.container).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
      });

      await spaceTest.step('navigate to last page and grid updates', async () => {
        await metricsExperience.pagination.getPageButton(TOTAL_PAGES - 1).click();
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(LAST_PAGE_CARDS);
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute(
          'id',
          FIRST_CARD_LAST_PAGE
        );
      });

      await spaceTest.step('navigate using next and prev arrows', async () => {
        await metricsExperience.pagination.getPageButton(0).click();
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_PAGE_1);

        await metricsExperience.pagination.nextButton.click();
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_PAGE_2);

        await metricsExperience.pagination.prevButton.click();
        await expect(metricsExperience.grid).toBeVisible();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
        await expect(metricsExperience.getCardByIndex(0)).toHaveAttribute('id', FIRST_CARD_PAGE_1);
      });
    });

    spaceTest('should filter metrics using search', async ({ pageObjects }) => {
      await pageObjects.discover.writeEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('search filters results across all pages', async () => {
        await metricsExperience.searchMetric(SEARCH_METRIC_NAME);
        await expect(metricsExperience.cards).toHaveCount(1);
      });

      await spaceTest.step('search for non-existent metric shows empty state', async () => {
        await metricsExperience.clearSearch();
        await metricsExperience.searchMetric('nonexistent_metric_xyz_123');
        await expect(metricsExperience.emptyState).toBeVisible();
      });

      await spaceTest.step('clearing search restores full grid', async () => {
        await metricsExperience.clearSearch();
        await expect(metricsExperience.emptyState).toBeHidden();
        await expect(metricsExperience.cards).toHaveCount(PAGE_SIZE);
      });
    });
  }
);
