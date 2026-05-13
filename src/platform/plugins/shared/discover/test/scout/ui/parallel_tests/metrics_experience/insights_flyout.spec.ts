/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Insights flyout tests.
 *
 * These tests use the dynamically created TSDB index (test-metrics-experience)
 * to exercise the insights flyout tabs and the dimensions pagination.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  testData,
  DEFAULT_TIME_RANGE,
  DIMENSIONS_PAGINATION,
} from '../../fixtures/metrics_experience';

const { TOTAL_PAGES, PAGE_SIZE, LAST_PAGE_ITEMS } = DIMENSIONS_PAGINATION;

spaceTest.describe(
  'Metrics in Discover - Insights Flyout',
  { tag: testData.METRICS_EXPERIENCE_TAGS },
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

    spaceTest(
      'should open insights flyout and verify tab content',
      async ({ pageObjects, page }) => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
        const { metricsExperience } = pageObjects;
        await expect(metricsExperience.grid).toBeVisible();

        await spaceTest.step('open flyout via View details', async () => {
          await metricsExperience.openInsightsFlyout(0);
          await expect(metricsExperience.flyout.container).toBeVisible();
        });

        await spaceTest.step('Overview tab shows description list', async () => {
          const { descriptionList } = metricsExperience.flyout.overview;
          await expect(descriptionList).toBeVisible();
          await expect(descriptionList).toContainText(testData.DATA_VIEW_NAME);
        });

        await spaceTest.step('Overview tab has no a11y violations', async () => {
          const { violations } = await page.checkA11y({
            include: ['[data-test-subj="metricsExperienceFlyoutOverviewTabContent"]'],
          });
          expect(violations).toHaveLength(0);
        });

        await spaceTest.step('switch to ES|QL Query tab and verify content', async () => {
          const { codeBlock, tabButton } = metricsExperience.flyout.esqlQuery;
          await tabButton.click();
          await expect(codeBlock).toBeVisible();
          await expect(codeBlock).toContainText(testData.METRICS_TEST_INDEX_NAME);
        });

        await spaceTest.step('ES|QL Query tab has no a11y violations', async () => {
          const { violations } = await page.checkA11y({
            include: ['[data-test-subj="metricsExperienceFlyoutEsqlQueryTabContent"]'],
          });
          expect(violations).toHaveLength(0);
        });

        await spaceTest.step('switch back to Overview tab', async () => {
          await metricsExperience.flyout.overview.tabButton.click();
          await expect(metricsExperience.flyout.overview.descriptionList).toBeVisible();
        });
      }
    );

    spaceTest('should paginate through dimensions in flyout', async ({ pageObjects }) => {
      await pageObjects.discover.writeAndSubmitEsqlQuery(testData.ESQL_QUERIES.TS);
      const { metricsExperience } = pageObjects;
      await expect(metricsExperience.grid).toBeVisible();

      await spaceTest.step('open flyout and verify pagination is visible', async () => {
        await metricsExperience.openInsightsFlyout(0);
        await expect(metricsExperience.flyout.container).toBeVisible();
        await expect(
          metricsExperience.flyout.overview.dimensionsPagination.container
        ).toBeVisible();
      });

      await spaceTest.step('navigate to last page', async () => {
        const { dimensionsPagination } = metricsExperience.flyout.overview;
        const lastPageButton = dimensionsPagination.getPageButton(TOTAL_PAGES - 1);
        await lastPageButton.click();
        await expect(metricsExperience.flyout.overview.dimensionsListItems).toHaveCount(
          LAST_PAGE_ITEMS
        );
      });

      await spaceTest.step('navigate using next and prev arrows', async () => {
        const { dimensionsPagination, dimensionsListItems } = metricsExperience.flyout.overview;
        const firstPageButton = dimensionsPagination.getPageButton(0);

        await firstPageButton.click();
        await expect(dimensionsListItems).toHaveCount(PAGE_SIZE);

        await dimensionsPagination.nextButton.click();
        await expect(dimensionsListItems).toHaveCount(LAST_PAGE_ITEMS);

        await dimensionsPagination.prevButton.click();
        await expect(dimensionsListItems).toHaveCount(PAGE_SIZE);
      });
    });
  }
);
